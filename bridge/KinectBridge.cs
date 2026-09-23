using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading;
using Microsoft.Kinect;

class KinectBridge
{
    const int MaskWidth = 384;
    const int MaskHeight = 318;
    const int SendIntervalMs = 55;
    static readonly string Endpoint = "http://127.0.0.1:8766/kinect";
    static KinectSensor sensor;
    static MultiSourceFrameReader reader;
    static CoordinateMapper mapper;
    static Body[] bodies;
    static byte[] bodyIndexData;
    static int depthWidth;
    static int depthHeight;
    static long lastSent;
    static long sequence;

    static void Main()
    {
        Console.Title = "NID Living Portal - Kinect v2 Bridge";
        sensor = KinectSensor.GetDefault();
        if (sensor == null)
        {
            Console.WriteLine("Kinect v2 was not found. Check power, adapter, and USB 3.0.");
            Console.ReadKey();
            return;
        }

        mapper = sensor.CoordinateMapper;
        bodies = new Body[sensor.BodyFrameSource.BodyCount];
        FrameDescription depthDescription = sensor.DepthFrameSource.FrameDescription;
        int depthPixels = (int)depthDescription.LengthInPixels;
        depthWidth = depthDescription.Width;
        depthHeight = depthDescription.Height;
        bodyIndexData = new byte[depthPixels];
        reader = sensor.OpenMultiSourceFrameReader(FrameSourceTypes.Body | FrameSourceTypes.BodyIndex);
        reader.MultiSourceFrameArrived += FrameArrived;
        sensor.Open();

        Console.WriteLine("Living Portal body + silhouette stream is live.");
        Console.WriteLine("Up to six visitors are tracked. Press Q to stop.");
        while (Console.ReadKey(true).Key != ConsoleKey.Q) { }
        reader.Dispose();
        sensor.Close();
    }

    static void FrameArrived(object sender, MultiSourceFrameArrivedEventArgs e)
    {
        if (DateTime.UtcNow.Ticks - lastSent < TimeSpan.TicksPerMillisecond * SendIntervalMs) return;
        MultiSourceFrame multi = e.FrameReference.AcquireFrame();
        if (multi == null) return;

        using (BodyFrame bodyFrame = multi.BodyFrameReference.AcquireFrame())
        using (BodyIndexFrame indexFrame = multi.BodyIndexFrameReference.AcquireFrame())
        {
            if (bodyFrame == null || indexFrame == null) return;
            bodyFrame.GetAndRefreshBodyData(bodies);
            List<int> tracked = new List<int>();
            for (int i = 0; i < bodies.Length; i++) if (bodies[i].IsTracked) tracked.Add(i);

            long seq = Interlocked.Increment(ref sequence);
            string json;
            if (tracked.Count == 0)
            {
                json = "{\"tracked\":false,\"seq\":" + seq.ToString(CultureInfo.InvariantCulture) + ",\"bodies\":[],\"mask\":\"\"}";
            }
            else
            {
                indexFrame.CopyFrameDataToArray(bodyIndexData);
                string mask = BuildMask();
                json = Serialize(tracked, mask, seq);
            }

            lastSent = DateTime.UtcNow.Ticks;
            ThreadPool.QueueUserWorkItem(_ => Post(json));
        }
    }

    static string BuildMask()
    {
        byte[] mask = new byte[MaskWidth * MaskHeight];
        for (int y = 0; y < MaskHeight; y++)
        {
            int sy = Math.Min(depthHeight - 1, y * depthHeight / MaskHeight);
            for (int x = 0; x < MaskWidth; x++)
            {
                int sx = Math.Min(depthWidth - 1, x * depthWidth / MaskWidth);
                byte bodyId = bodyIndexData[sy * depthWidth + sx];
                if (bodyId <= 5) mask[y * MaskWidth + x] = (byte)(bodyId + 1);
            }
        }
        return Convert.ToBase64String(mask);
    }

    static string Serialize(List<int> tracked, string mask, long seq)
    {
        StringBuilder s = new StringBuilder(100000);
        s.Append("{\"tracked\":true,\"seq\":").Append(seq)
         .Append(",\"mw\":").Append(MaskWidth).Append(",\"mh\":").Append(MaskHeight)
         .Append(",\"mask\":\"").Append(mask).Append("\",\"bodies\":[");

        List<int> ordered = tracked.OrderBy(i => bodies[i].Joints[JointType.SpineBase].Position.Z).ToList();
        for (int n = 0; n < ordered.Count; n++)
        {
            int bodyIndex = ordered[n];
            Body b = bodies[bodyIndex];
            if (n > 0) s.Append(',');
            s.Append("{\"id\":\"").Append(b.TrackingId).Append("\",\"index\":").Append(bodyIndex)
             .Append(",\"left\":").Append((int)b.HandLeftState).Append(",\"right\":").Append((int)b.HandRightState)
             .Append(",\"joints\":[");
            for (int i = 0; i < 25; i++)
            {
                Joint j = b.Joints[(JointType)i];
                DepthSpacePoint p = mapper.MapCameraPointToDepthSpace(j.Position);
                float x = p.X / depthWidth, y = p.Y / depthHeight;
                if (float.IsInfinity(x) || float.IsNaN(x) || float.IsInfinity(y) || float.IsNaN(y)) { x = .5f; y = .5f; }
                if (i > 0) s.Append(',');
                s.Append("{\"x\":").Append(F(x)).Append(",\"y\":").Append(F(y))
                 .Append(",\"z\":").Append(F(j.Position.Z)).Append(",\"state\":").Append((int)j.TrackingState).Append('}');
            }
            s.Append("]}");
        }
        s.Append("]}");
        return s.ToString();
    }

    static string F(float value) { return value.ToString("0.####", CultureInfo.InvariantCulture); }

    static void Post(string json)
    {
        try
        {
            byte[] data = Encoding.UTF8.GetBytes(json);
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(Endpoint);
            request.Method = "POST";
            request.ContentType = "application/json";
            request.ContentLength = data.Length;
            request.Timeout = 500;
            using (Stream stream = request.GetRequestStream()) stream.Write(data, 0, data.Length);
            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse()) { }
        }
        catch { }
    }
}
