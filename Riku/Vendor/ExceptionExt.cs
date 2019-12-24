using System;
using System.Text;

namespace Exy {
    public static class ExceptionExt {
        public static String GetExceptionMessage(this Exception ex) {
            var errorList = new StringBuilder();
            if (ex.InnerException != null)
                errorList.AppendLine(GetExceptionMessage(ex.InnerException));

            return errorList
                .AppendLine(ex.Message)
                .AppendLine(ex.StackTrace)
                .ToString();
        }
    }
}
