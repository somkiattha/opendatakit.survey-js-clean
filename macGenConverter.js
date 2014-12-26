var XRegExp = require('./xlsxconverter/XRegExp-All-3.0.0-pre-2013-08-27.js');
var readline = require('readline');
var _ = require('./devEnv/libs/underscore.js');
var XLSXConverter = require('./xlsxconverter/XLSXConverter2.js');
var fs = require('fs');
var path = require('path');
var Buffer = require('buffer').Buffer;
var constants = require('constants');
var XLSX = require('xlsx');
var util = require('./devEnv/js/devenv-util.js');

function to_json(workbook) {
    var result = {};
    _.each(workbook.SheetNames, function(sheetName) {
        var rObjArr = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName],{raw:true});
        rObjArr = util.removeEmptyStrings(rObjArr);
        if(rObjArr.length > 0){
            result[sheetName] =  rObjArr;
        }
    });
    return result;
}

function downloadCsvFile (csvContent, fileName) {
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    link.click();
}

function writeOutDef(formDefStr) {
    // Write the definition.csv if necessary
    var formDefJson = JSON.parse(formDefStr);
    var tableId = util.getTableIdFromFormDef(formDefJson);

    var dtm = util.getDataTableModelFromFormDef(formDefJson);

    if (!fs.existsSync(defPath)) {
        var defCsv = util.createDefinitionCsvFromDataTableModel(dtm);
        fs.writeFileSync(defPath, defCsv);
    }
}

function writeOutProp(formDefStr) {
    // Write the properties.csv if necessary
    var formDefJson = JSON.parse(formDefStr);
    var tableId = util.getTableIdFromFormDef(formDefJson);

    var dtm = util.getDataTableModelFromFormDef(formDefJson);


    if (!fs.existsSync(propPath)) {
        var propCsv = util.createPropertiesCsvFromDataTableModel(dtm, formDefJson);
        fs.writeFileSync(propPath, propCsv);
    }
    
}

var result = "";
var b64xlsx = "";
var processedWorkbook = {};

// Make sure we got a filename on the command line.
if (process.argv.length < 3) {
    console.log('Usage: node ' + process.argv[1] + ' FILENAME');
    process.exit(1);
}

// Read the file
var fs = require('fs');
var filename = process.argv[2];
fs.readFile(filename, 'base64', function(err, data) {
    if (err) {
        throw err;
    }
    b64xlsx += data;
});

b64xlsx = fs.readFileSync(filename, 'base64');

try {
    var xlsx = XLSX.read(b64xlsx, {type: 'base64'});    
    var jsonWorkbook = to_json(xlsx);
    var processedWorkbook = XLSXConverter.processJSONWb(jsonWorkbook);
    result = JSON.stringify(processedWorkbook, 2, 2);

} catch(e) {
    console.log(e.stack);
}
console.log(result);

// Write out the definition.csv if necessary
var writeOutDefAndProp = util.shouldWriteOutDefinitionAndPropertiesCsv(result);
var tableId = util.getTableIdFromFormDef(processedWorkbook);
var defPath = 'app/tables/' + tableId + '/definition.csv';
try {
    if (writeOutDefAndProp) {
        writeOutDef(result);
    }
} catch (e) {
    fs.writeFileSync(defPath, e.stack);
}

// Write out the properties.csv if necessary
var propPath = 'app/tables/' + tableId + '/properties.csv';
try {
    if (util.shouldWriteOutDefinitionAndPropertiesCsv(result)) {
        writeOutProp(result);
    }
} catch (e) {
    fs.writeFileSync(propPath, e.stack);
}



