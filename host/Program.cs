using System.Windows;

namespace LivingPortalHost;

static class Program
{
    [STAThread]
    public static void Main()
    {
        var application = new System.Windows.Application
        {
            ShutdownMode = ShutdownMode.OnMainWindowClose
        };
        var window = new MainWindow();
        application.MainWindow = window;
        application.Run(window);
    }
}
