using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
using Microsoft.Web.WebView2.Core;

namespace LivingPortalHost;

public partial class MainWindow : Window
{
    const uint SWP_SHOWWINDOW = 0x0040;
    readonly string url;

    [DllImport("user32.dll")]
    static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int width, int height, uint flags);

    public MainWindow()
    {
        InitializeComponent();
        url = Environment.GetCommandLineArgs().Skip(1).FirstOrDefault() ?? "http://127.0.0.1:8766";
        SourceInitialized += PlaceOnProjector;
        Loaded += StartPortal;
        Closing += (_, _) => Browser.Dispose();
    }

    void PlaceOnProjector(object? sender, EventArgs e)
    {
        var screens = System.Windows.Forms.Screen.AllScreens;
        var target = screens.FirstOrDefault(screen => !screen.Primary) ?? screens[0];
        var bounds = target.Bounds;
        var handle = new WindowInteropHelper(this).Handle;
        SetWindowPos(handle, IntPtr.Zero, bounds.X, bounds.Y, bounds.Width, bounds.Height, SWP_SHOWWINDOW);
    }

    async void StartPortal(object sender, RoutedEventArgs e)
    {
        try
        {
            var dataFolder = Path.Combine(Path.GetTempPath(), "NIDLivingPortalWebView2");
            var environment = await CoreWebView2Environment.CreateAsync(null, dataFolder);
            await Browser.EnsureCoreWebView2Async(environment);
            Browser.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            Browser.CoreWebView2.Settings.AreDevToolsEnabled = false;
            Browser.CoreWebView2.Settings.IsStatusBarEnabled = false;
            Browser.CoreWebView2.Settings.IsZoomControlEnabled = false;
            Browser.CoreWebView2.Settings.IsPasswordAutosaveEnabled = false;
            Browser.CoreWebView2.Settings.IsGeneralAutofillEnabled = false;
            Browser.NavigationCompleted += (_, _) => Browser.Focus();
            Browser.CoreWebView2.Navigate(url);
        }
        catch (Exception exception)
        {
            Debug.WriteLine(exception);
            System.Windows.MessageBox.Show("Living Portal could not start its projection renderer.\n\n" + exception.Message,
                "Living Portal", MessageBoxButton.OK, MessageBoxImage.Error);
            Close();
        }
    }
}
