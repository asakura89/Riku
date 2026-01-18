package main

import (
    "fmt"
    "io"
    //"io/ioutil"
    "log"
    "net/http"
    "os"
    "path/filepath"
    "strings"

    "risu/core"

    "github.com/gin-gonic/gin"
)

func HandleGETRoot(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{"message": "GET request received"})
}

func HandlePOSTAuditTrails(c *gin.Context) {
    c.JSON(http.StatusCreated, gin.H{"message": "POST request received"})
}

func convertPathToUrl(rootPath string, path string) (string) {
    relativePath := strings.TrimPrefix(path, rootPath)
    url := strings.ReplaceAll(relativePath, "\\", "/")

    return url
}

type PathAndUrl struct {
    Name string
    Path string
    Url string
}

func getFoldersPathAndUrl(rootPath string, path string) ([]*PathAndUrl, error) {
    files, err := os.ReadDir(path)
    if err != nil {
        return nil, err
    }

    var pathsAndUrls []*PathAndUrl
    for _, file := range files {
        if file.IsDir() {
            filePath := filepath.Join(path, file.Name())
            url := convertPathToUrl(rootPath, filePath)
            pathsAndUrls = append(pathsAndUrls, &PathAndUrl{
                Name: file.Name(),
                Path: filePath,
                Url: url,
            })
        }
    }

    return pathsAndUrls, nil
}

func getFilesPathAndUrl(rootPath string, path string) ([]*PathAndUrl, error) {
    //files, err := ioutil.ReadDir(folderPath)
    files, err := os.ReadDir(path)
    if err != nil {
        return nil, err
    }

    var pathsAndUrls []*PathAndUrl
    for _, file := range files {
        if !file.IsDir() {
            filePath := filepath.Join(path, file.Name())
            url := convertPathToUrl(rootPath, filePath)
            pathsAndUrls = append(pathsAndUrls, &PathAndUrl{
                Name: file.Name(),
                Path: filePath,
                Url: url,
            })
        }
    }

    return pathsAndUrls, nil
}

func readFileAsText(filename string) (string, error) {
    file, err := os.Open(filename)
    if err != nil {
        return "", err
    }

    defer file.Close()

    contentBytes, err := io.ReadAll(file)
    if err != nil {
        return "", err
    }

    contentText := string(contentBytes)
    return contentText, nil
}

func readFile(filename string) ([]byte, error) {
    file, err := os.Open(filename)
    if err != nil {
        return nil, err
    }

    defer file.Close()

    contentBytes, err := io.ReadAll(file)
    if err != nil {
        return nil, err
    }

    return contentBytes, nil
}

func main() {
    rootDir, _, err := core.GetAppInfo()
    if err != nil {
        log.Fatal(err)
        os.Exit(1)
    }

    router := gin.Default()

    staticFilePath := filepath.Join(rootDir, "static")
    foldersPathAndUrl, err := getFoldersPathAndUrl(rootDir, staticFilePath)
    if err != nil {
        log.Fatal(err)
        os.Exit(1)
    }

    //var routerGroups []*gin.RouterGroup
    var allFilesPathAndUrl []*PathAndUrl
    for _, pathAndUrl := range foldersPathAndUrl {
        //group := router.Group(pathAndUrl.Url)
        filesPathAndUrl, err := getFilesPathAndUrl(rootDir, pathAndUrl.Path)
        if err != nil {
            log.Fatal(err)
            os.Exit(1)
        }

        for _, filePathAndUrl := range filesPathAndUrl {
            allFilesPathAndUrl = append(allFilesPathAndUrl, filePathAndUrl)
            //router.StaticFile(filePathAndUrl.Url, filePathAndUrl.Path)
            text, err := readFileAsText(filePathAndUrl.Path)
            //xmlBytes, err := readFile(filePathAndUrl.Path)
            //if err != nil || xmlBytes == nil {
            if err != nil {
                log.Fatal(err)
                os.Exit(1)
            }

            router.GET(filePathAndUrl.Url, func (c *gin.Context) {
                //c.XML(http.StatusOK, xmlBytes)
                //c.XML(http.StatusOK, text)
                /*c.XML(http.StatusOK, gin.H{
                    "content": text,
                })*/
                c.String(http.StatusOK, "%s", text)
            })
        }
    }

    router.GET("/", func (c *gin.Context) {
        c.JSON(http.StatusOK, allFilesPathAndUrl)
    })

    // var routerGroups []*gin.RouterGroup
    // for _, dir := range staticSubDirPaths {
    //     splittedPath := filepath.SplitList(dir)
    //     name := splittedPath[len(splittedPath)-1]

    //     group := router.Group()
    // }

    // openSearch := router.Group("/static/osdx")
    // {

    //     filePaths = getFiles()
    //     //openSearch.GET()
    // }
    // router.GET("/", HandleGETRoot)

    router.Run(fmt.Sprintf(":%d", 8673))
}
