var fs = require('fs'),
    path = require('path'),
    _ = require('lodash');

var defaultConfig = {
  prodSourceRoot: __dirname + '/../../app',
  testSourceRoot: __dirname + '/../../spec',
  requireSymbol: "$"
};

function LSRequireCore(_config) {

  var config = _.defaults({}, _config, defaultConfig);
  var allRequireableFiles = dirTree(config.prodSourceRoot, dirTree(config.testSourceRoot));

  function isProdSource(file) {
    return file.indexOf(config.prodSourceRoot) != -1;
  }

  function isTestSource(file) {
    return file.indexOf(config.testSourceRoot) != -1;
  }

  function dirTree(directory, destination) {
    destination = destination || {};

    var stats = fs.lstatSync(directory),
        info = {
          path: directory,
          name: path.basename(directory)
        };

    if (stats.isDirectory()) {
      fs.readdirSync(directory).map(function (child) {
        dirTree(directory + '/' + child, destination);
      });
    } else {
      destination[info.name] = (destination[info.name] || []).concat(info.path);
    }

    return destination;
  }

  function getRelativePath(requireString, from) {
    var fileWithExtension = requireString.replace("$", "") + ".js";
    var resolvedFiles = allRequireableFiles[fileWithExtension];

    if (!resolvedFiles) {
      throw ("Error: Couldn't find any match for: " + requireString);
    }

    if (resolvedFiles.length > 1) {
      throw ("Error: Found multiple matches for: " + requireString + ": " + resolvedFiles.join(","));
    }

    var resolvedFile = resolvedFiles[0];

    if (isProdSource(from) && isTestSource(resolvedFile)) {
      throw ("Error: Production code cannot require test code: " + from + ", " + resolvedFile);
    }

    var dirname1 = path.dirname(from);
    var dirname2 = path.dirname(resolvedFile);
    var relativePath = path.relative(dirname1, dirname2);

    if (!relativePath) {                            /* same directory*/
      relativePath = "./" + relativePath;
    } else if (relativePath.indexOf("..") === 0) {  /* up one or more*/
      relativePath = relativePath + "/";
    } else {                                        /* in a child directory of current directory */
      relativePath = "./" + relativePath + "/";
    }

    return relativePath + fileWithExtension
  }

  return {
    resolve: function (requestedFile, sourceFile) {
      if (requestedFile.indexOf(config.requireSymbol) === 0) {
        return getRelativePath(requestedFile, sourceFile);
      }
      return requestedFile;
    }
  }

}

module.exports = LSRequireCore;