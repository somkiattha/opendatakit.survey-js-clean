//'use strict';
// don't warn about unused parameters, since all of these methods are stubs
/* jshint unused: vars */
/* global $ */

/**
 * This represents the Control object handed to the android web view in the
 * Tables code.
 *
 * It should provide all the functions available to the javascript at this
 * version of the code. It corresponds to
 * org.opendatakit.tables.view.webkits.ControlIf.
 */


/**
 * Compute and return the base URI for this machine. This will allow the code
 * to function independently of the host name.
 * 
 * Returns a string representing the base uri in the format:
 * http://DOMAIN/DIRS/. Note the trailing slash.
 */
function computeBaseUri() {
  // To compute this we are going to rely on the location of the containing
  // file relative to the location we are serving as are root. If this is
  // changed, this file must be updated appropriately.
  // Since we are expecting this file to live in app/framework/survey/js/, we
  // can look for the first occurrence and take everything before it.

  var expectedFileLocation = 'framework/tables/js/control.js';

  var fileLocation = getCurrentFileLocation();

  var indexToFile = fileLocation.indexOf(expectedFileLocation);

  var result = fileLocation.substring(0, indexToFile);

  return result;

}


/**
 * Return the location of the currently executing file.
 */
function getCurrentFileLocation() {
  // We need to get the location of the currently
  // executing file. This is not readily exposed, and it is not as simple as
  // finding the current script tag, since callers might be loading the file
  // using RequireJS or some other loading library. We're going to instead
  // pull the file location out of a stack trace.
  var error = new Error();
  var stack = error.stack;
  
  // We expect the stack to look something like:
  // TypeError: undefined is not a function
  //     at Object.window.shim.window.shim.getPlatformInfo
  //     (http://homes.cs.washington.edu/~sudars/odk/survey-js-adaptr/app/framework/survey/js/shim.js:45:29)
  //     blah blah blah
  // So now we'll extract the file location. We'll do this by assuming that
  // the location occurs in the first parentheses.
  var openParen = stack.indexOf('(');
  var closedParen = stack.indexOf(')');

  var fileLocation = stack.substring(openParen + 1, closedParen);

  return fileLocation;
}



/**
 * The idea of this call is that if we're on the phone, control will have been
 * set by the java framework. This script, however, should get run at the top
 * of the file no matter what. This way we're sure not to stomp on the java
 * object.
 */
if (!window.control) {
    
    var importSynchronous = function(script) {
        // script is appName-relative -- need to prepend the appName.
        
        var path = window.location.pathname;
        if ( path[0] === '/' ) {
            path = path.substr(1);
        }
        if ( path[path.length-1] === '/' ) {
            path = path.substr(0,path.length-1);
        }
        var parts = path.split('/');
        // IMPORTANT: ajax doesn't like the explicit 
        // scheme and hostname. Drop those, and just
        // specify an absolute URL (starting with /).
        var urlScript = '/' + parts[0] + '/' + script;
        
        // get the script body
        var jqxhr = $.ajax({
            type: "GET",
            url: urlScript,
            dataType: "json",
            async: false
        });
        
        // and eval it in the context of window
        with (window) {
            eval(jqxhr.responseText);
        }
    }
    
    // This will be the object specified in control.json. It is not set until
    // setBackingObject is called.
    var controlObj = null;

    /**
     * Returns true if a variable is an array.
     */
    var isArray = function(varToTest) {
        if (Object.prototype.toString.call(varToTest) === '[object Array]') {
            return true;
        } else {
            return false;
        }
    };

    /**
     * Returns true if str is a string, else false.
     */
    var isString = function(str) {
        return (typeof str === 'string');
    };

    /**
     * This is a helper method to DRY out the type checking for the open*
     * methods that take the tableId, sqlWhereClause, sqlSelectionArgs, and
     * relativePath parameters.
     */
    var assertOpenTypes = function(fnName, tableId, where, args, path) {
        if (!isString(tableId)) {
            throw fnName + '--tableId not a string';
        }
        if (!isString(where) && where !== null && where !== undefined) {
            throw fnName + '--sqlWhereClause not a string';
        }
        if (!isArray(args) && args !== null && args !== undefined) {
            throw fnName + '--sqlSelectionArgs not an array';
        }
        if (!isString(path) && path !== null && path !== undefined) {
            throw fnName + '--relativePath not a string';
        }
    };

    // The module object.
    var pub = {};

    pub.addRow = function(tableId, stringified) {
        var parsed = JSON.parse(stringified);
        console.log('parsed: ' + parsed);

        console.log(
                'trying to add to table: ' +
                tableId +
                ' data: ' +
                stringified);

        return true;
    };

    pub.updateRow = function(tableId, stringified, rowId)  {
        var parsed = JSON.parse(stringified);
        console.log('parsed for update: ' + parsed);

        console.log(
                'trying to update rowId: ' + rowId +
                ' in table id: ' + tableId +
                stringified);

        return true;
    };

    // Compute the base uri.
    var baseUri = computeBaseUri();

    pub.getPlatformInfo = function() {
        // 9000 b/c that's what grunt is running on. Perhaps should configure
        // this
        var platformInfo = {
            container: 'Chrome',
            version: '31.0.1650.63',
            appName: 'Tables-test',
            baseUri: baseUri,
            logLevel: 'D'
        };
        // Because the phone returns a String, we too are going to return a
        // string here.
        var result = JSON.stringify(platformInfo);
        return result;
    };

    pub.getFileAsUrl = function(relativePath) {
        // strip off backslashes
        var cleanedStr = relativePath.replace(/\\/g, '');
        var baseUri = JSON.parse(pub.getPlatformInfo()).baseUri;
        var result = baseUri + cleanedStr;
        return result;
    }

    pub.getRowFileAsUrl = function(tableId, rowId, relativePath) {
        if ( tableId === null || tableId === undefined ) return null;
        if ( rowId === null || rowId === undefined ) return null;
        if ( relativePath === null || relativePath === undefined ) return null;

        if ( relativePath.charAt(0) === '/' ) {
            relativePath = relativePath.substring(1);
        }
        var baseUri = JSON.parse(pub.getPlatformInfo()).baseUri;

        var result = null;
        
        if ( pub._forbiddenInstanceDirCharsPattern === null ||
             pub._forbiddenInstanceDirCharsPattern === undefined ) {
            // defer loading this until we try to use it
            importSynchronous('framework/libs/XRegExp-All-3.0.0-pre-2014-12-24.js');
            pub._forbiddenInstanceDirCharsPattern = window.XRegExp('(\\p{P}|\\p{Z})', 'A');
        }

        var iDirName = XRegExp.replace(rowId, 
                        pub._forbiddenInstanceDirCharsPattern, '_', 'all');

        var prefix = 'tables/' + tableId + '/instances/' + iDirName + '/';
        if ( relativePath.length > prefix.length && relativePath.substring(0,prefix.length) === prefix ) {
            console.error("getRowFileAsUrl - detected filepath in rowpath data");
            result = baseUri + relativePath;
        } else {
            result = baseUri + prefix + relativePath;
        }
        
        return result;
    };
    
    /**
     * This is the only function that is exposed to the caller that is NOT a 
     * function exposed to the android object. It is intended only for use on
     * framework testing in Chrome. This allows us to specify a different file
     * when we want to test the functionality of the control object.
     *
     * jsonObj should be a JSON object.
     */
    pub.setBackingObject = function(jsonObj) {
        controlObj = jsonObj;
    };

    pub.openTable = function(tableId, sqlWhereClause, sqlSelectionArgs) {
        if (!isString(tableId)) {
            throw 'openTable()--tableId not a string';
        }
        // We're checking for null and undefined because it isn't specified
        // what the Android WebKit passes in to us in the event of null or
        // overloading objects.
        if (!isString(sqlWhereClause) &&
                sqlWhereClause !== null &&
                sqlWhereClause !== undefined) {
            throw 'openTable()--sqlWhereClause not a string';
        }
        if (!isArray(sqlSelectionArgs) &&
                sqlSelectionArgs !== null &&
                sqlSelectionArgs !== undefined) {
            throw 'openTable()--sqlSelectionArgs not an array';
        }
        if (arguments.length > 3) {
            throw 'openTable()--too many arguments';
        }
        console.log('called openTable(). Unclear where to navigate,' +
                ' so opening list view.');
        pub.openTableToListView(
                tableId,
                sqlWhereClause,
                sqlSelectionArgs,
                null);
    };

    pub.openTableToListView = function(tableId, sqlWhereClause,
        sqlSelectionArgs, relativePath) {
        assertOpenTypes('openTableToListView()',
                tableId,
                sqlWhereClause,
                sqlSelectionArgs,
                relativePath);
        if (arguments.length > 4) {
            throw 'openTableToListView()--too many arguments';
        }
        if (relativePath === null) {
            // then we need the default
            relativePath = controlObj.tables[tableId].defaultListFile;
        }
        relativePath = pub.getFileAsUrl(relativePath);
        window.location.href = relativePath;
    };

    pub.openTableToMapView = function(tableId, sqlWhereClause,
        sqlSelectionArgs, relativePath) {
        assertOpenTypes('openTableToMapView()',
                tableId,
                sqlWhereClause,
                sqlSelectionArgs,
                relativePath);
        if (arguments.length > 4) {
            throw 'openTableToMapView()--too many arguments';
        }
    };

    pub.openTableToSpreadsheetView = function(tableId, sqlWhereClause,
        sqlSelectionArgs) {
        // We're going to rely on the fact that the path can be nullable and
        // thus use the assertHelper, just passing in null.
        assertOpenTypes('openTableToSpreadsheetView()',
                tableId,
                sqlWhereClause,
                sqlSelectionArgs,
                null);
        if (arguments.length > 3 ) {
            throw 'openTableToSpreadsheetView()--too many arguments';
        }
    };

    pub.query = function(tableId, sqlWhereClause, sqlSelectionArgs) {
        if (!isString(tableId)) {
            throw 'query()--tableId not a string';
        }
        if (!isString(sqlWhereClause) &&
                sqlWhereClause !== null &&
                sqlWhereClause !== undefined) {
            throw 'query()--sqlWhereClause not a string';
        }
        if (!isArray(sqlSelectionArgs) &&
                sqlSelectionArgs !== null &&
                sqlSelectionArgs !== undefined) {
            throw 'query()--sqlSelectionArgs not an array';
        }
        if (arguments.length > 3) {
            throw 'query()--too many arguments';
        }
        // Now we need to get the object.
        var newTableData = window.__getTableData();
        $.ajax({
            url: pub.getFileAsUrl('output/debug/' + tableId + '_data.json'),
            success: function(dataObj) {
                newTableData.setBackingObject(dataObj);
            },
            async: false
        });
        return newTableData;
    };

    pub.releaseQueryResources = function(tableId) {
        if (!isString(tableId)) {
            throw 'releaseQueryResources()--tableId not a string';
        }
        if (arguments.length > 1) {
            throw 'releaseQueryResources()--too many arguments';
        }
    };

    pub.getAllTableIds = function() {
        var tableIds = [];
        $.map(controlObj.tableIdToDisplayName, function(value, key) {
            tableIds.push(key);
        });
        return tableIds;
    };

    pub.launchHTML = function(relativePath) {
        if (!isString(relativePath)) {
            throw 'launchHTML()--relativePath not a string';
        }
        // We don't have a default for this, so just launch it.
        relativePath = pub.getFileAsUrl(relativePath);
        window.location.href = relativePath;
    };

    pub.openDetailView = function(tableId, rowId, relativePath) {
        if (!isString(tableId)) {
            throw 'openDetailView()--tableId not a string';
        }
        if (!isString(rowId)) {
            throw 'openDetailView()--rowId not a string';
        }
        if (!isString(relativePath) &&
                relativePath !== null &&
                relativePath !== undefined) {
            throw 'openDetailView()--relativePath not a string';
        }
        if (relativePath === null) {
            // Then we need the default
            relativePath = controlObj.tables[tableId].defaultDetailFile;
        }
        relativePath = pub.getFileAsUrl(relativePath);
        window.location.href = relativePath;
    };

    pub.addRowWithCollectDefault = function(tableId) {
        if (!isString(tableId)) {
            throw 'addRowWithCollectDefault()--tableId not a string';
        }
        pub.addRowWithCollect(tableId, null, null, null, null);
    };

    pub.addRowWithCollect = function(tableId, formId, formVersion,
        formRootElement, jsonMap) {

    };

    pub.editRowWithCollectDefault = function(tableId, rowId) {
        pub.editRowWithCollect(tableId, rowId, null, null, null);
    };

    pub.editRowWithCollect = function(tableId, rowId, formId, formVersion,
            formRootElement) {

    };

    pub.editRowWithSurveyDefault = function(tableId, rowId) {
        pub.editRowWithSurve(tableId, rowId, null, null);
    };

    pub.editRowWithSurvey = function(tableId, rowId, formId, screenPath) {
        
    };

    pub.addRowWithSurveyDefault = function(tableId) {
        pub.addRowWithSurvey(tableId, null, null, null);
    };

    pub.addRowWithSurvey = function(tableId, formId, screenPath, jsonMap) {

    };

    pub.getElementKey = function(tableId, elementPath) {
        // This we get through the control object.
        // We first need to check to make sure that this tableId even exists.
        // If it does not, we return undefined, which is the behavior on the
        // phone.
        if (!controlObj.tables.hasOwnProperty(tableId)) {
            return undefined;
        }
        return controlObj.tables[tableId].pathToKey[elementPath];
    };

    pub.getColumnDisplayName = function(tableId, elementPath) {
        // This we just get through the control object.
        // We first need to check that the tableId even exists. If not, we will
        // return undefined, as is the behavior on the phone.
        if (!controlObj.tables.hasOwnProperty(tableId)) {
            return undefined;
        }
        return controlObj.tables[tableId].pathToName[elementPath];
    };

    pub.getTableDisplayName = function(tableId) {
        // just pass it through the control object.
        // Return undefined if the table id doesn't exist, which is the
        // behavior on the phone.
        if (!controlObj.tableIdToDisplayName.hasOwnProperty(tableId)) {
            return undefined;
        }
        return controlObj.tableIdToDisplayName[tableId];
    };

    pub.columnExists = function(tableId, elementPath) {
        return pub.getElementKey(tableId, elementPath) !== undefined;
    };

    // Now we also need to set the backing object we are going to use. We
    // assume it is in the output/debug directory.
    $.ajax({
        url: pub.getFileAsUrl('output/debug/control.json'),
        success: function(data) {
            var controlObject = data;
            pub.setBackingObject(controlObject);
        },
        async: false
    });

    window.control = window.control || pub;

}
