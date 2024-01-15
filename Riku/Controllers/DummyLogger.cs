namespace Riku.Controllers {
    public static class DummyLogger {
        static ScriptInfo GetScriptInfo() {
            String workingPath = null;
            if (String.IsNullOrEmpty(Environment.GetCommandLineArgs()[0]))
                workingPath = Directory.GetCurrentDirectory();
            else
                workingPath = Environment.GetCommandLineArgs()[0];

            if (workingPath == null)
                return new ScriptInfo(null, null, null);

            var workingDir = new DirectoryInfo(workingPath);
            if (workingDir.Attributes.HasFlag(FileAttributes.Directory))
                return new ScriptInfo(workingDir.Name, workingDir.FullName, workingDir);

            return new ScriptInfo(Path.GetFileNameWithoutExtension(workingPath), Path.GetFileName(workingPath), workingDir.Parent);
        }

        public static void Log(String message, Boolean starting = false, Boolean writeToScreen = false) {
            var scriptInfo = GetScriptInfo();
            if (scriptInfo.Name != null) {
                String logName = $"{scriptInfo.Name}_{DateTime.Now.ToString("yyyyMMddHHmm")}.log";
                String logFile = Path.Combine(scriptInfo.Directory.FullName, logName);

                String logMsg = $"[{DateTime.Now.ToString("yyyy.MM.dd.HH:mm:ss")}] {message}";
                if (writeToScreen)
                    Console.WriteLine(logMsg);

                if (starting)
                    File.WriteAllText(logFile, logMsg, System.Text.Encoding.UTF8);
                else
                    File.AppendAllText(logFile, "\r\n\r\n" + logMsg, System.Text.Encoding.UTF8);
            }
        }

        class ScriptInfo {
            public String Name { get; }
            public String FullName { get; }
            public DirectoryInfo Directory { get; }

            public ScriptInfo(String name, String fullName, DirectoryInfo directory) {
                Name = name;
                FullName = fullName;
                Directory = directory;
            }
        }
    }
}
