var transformTools = require('browserify-transform-tools');

var fs = require('fs'),
    path = require('path');

var PRODUCTION_SOURCE_ROOT = __dirname  + "/app";
var TEST_SOURCE_ROOT = __dirname  + "/spec";

function dirTree(filename, srcTree) {
  srcTree = srcTree || {};

  var stats = fs.lstatSync(filename),
      info = {
        path: filename,
        name: path.basename(filename)
      };


  if (stats.isDirectory()) {
    fs.readdirSync(filename).map(function(child) {
      dirTree(filename + '/' + child, srcTree);
    });
  } else {
    srcTree[info.name] = (srcTree[info.name] || []).concat(info.path);
  }

  return srcTree;
}

function isProdSource(file) {
  return file.indexOf(PRODUCTION_SOURCE_ROOT) != -1;
}

function isTestSource(file) {
  return file.indexOf(TEST_SOURCE_ROOT) != -1;
}

var allRequireableFiles = dirTree(PRODUCTION_SOURCE_ROOT, dirTree(TEST_SOURCE_ROOT));

function pathFor(cb, requireString, currentBrowserifyingFile) {
  var fileWithExtension = requireString.replace("$", "") + ".js";
  var matchedFiles = allRequireableFiles[fileWithExtension];

  if (!matchedFiles) {
    return cb("Error: Couldn't find any match for: " + requireString);
  }

  if(matchedFiles.length > 1) {
    return cb("Error: Found multiple matches for: " + requireString + ": " + matchedFiles.join(","));
  }

  var matchedRequireFile = matchedFiles[0];

  if(isProdSource(currentBrowserifyingFile) && isTestSource(matchedRequireFile)) {
    return cb("Error: Production code cannot require test code: " + currentBrowserifyingFile + ", " + matchedRequireFile);
  }

  var dirname1 = path.dirname(currentBrowserifyingFile);
  var dirname2 = path.dirname(matchedRequireFile);
  var relativePath = path.relative(dirname1, dirname2);

  if(!relativePath) {                           /* same directoryi*/
    relativePath = "./" + relativePath;
  } else if(relativePath.indexOf(".") === 0) {  /* up one or more*/
    relativePath = relativePath + "/";
  } else {                                      /* in a child dirctory of current directory */
    relativePath = "./" + relativePath + "/";
  }

  var result = "require('"  + relativePath + fileWithExtension + "')";
  cb(null, result);
}

module.exports = transformTools.makeRequireTransform("lsrequireify", {jsFilesOnly: true, fromSourceFileDir: true},
  function (args, opts, cb) {
    if(args[0].indexOf("$") === 0)  {
      return pathFor(cb, args[0], opts.file)
    }
    cb();
});