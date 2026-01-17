package core

import (
    "os"
    "path/filepath"
)

func GetAppInfo() (string, string, error) {
    app, err := os.Executable()
    if err != nil {
        return "", "", err
    }

    absPath, err := filepath.Abs(app)
    if err != nil {
        return "", "", err
    }

    dir := filepath.Dir(absPath)
    name := filepath.Base(absPath)

    return dir, name, nil
}