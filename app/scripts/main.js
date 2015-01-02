//////////////////////////////////////////////////////////////////////////// Encrypted embedded data
var fileName = 'REPLACE_WITH_FILE_NAME_';
var fileType = 'REPLACE_WITH_FILE_TYPE_';
var cipherData = 'REPLACE_WITH_FILE_DATA_';

///////////////////////////////////////////////////////////////////////////////// Progress indicator
var progressPath = document.querySelector('.progress path');
var pathLength = progressPath.getTotalLength();
progressPath.style.transition = progressPath.style.WebkitTransition =
  'none';
progressPath.style.strokeDasharray = pathLength + ' ' + pathLength;
progressPath.style.strokeDashoffset = pathLength;
progressPath.getBoundingClientRect();
progressPath.style.transition = progressPath.style.WebkitTransition =
  'stroke-dashoffset 300ms linear';

var updateProgress = function (percent) {
  var progress = pathLength - pathLength*(percent/100.0);
  progressPath.style.strokeDashoffset = progress;
  document.getElementById("percent").innerHTML = percent+"%";
}

// Progress hook
var progress = [];

var reset_progress = function () {
  progress = [];
  document.getElementById("progress-summary").innerHTML = '';
};

var progress_hook_encrypt = function(p) {
  var h, pr, _i, _len;
  var progressPercent = 0;
  if (progress.length && (progress[progress.length - 1].what === p.what)) {
    progress[progress.length - 1] = p;
  } else {
    progress.push(p);
  }
  h = "";
  for (_i = 0, _len = progress.length; _i < _len; _i++) {
    pr = progress[_i];
    h += "<li>" + pr.what + " " + pr.i + "/" + pr.total + "</li>";
    if (_i == 0) {
      progressPercent += (10.0 * (pr.i / pr.total));
    }
    else {
      progressPercent += (15.0 * (pr.i / pr.total));
    }
  }
  updateProgress(Math.floor(progressPercent));
  document.getElementById("progress-summary").innerHTML = h;
};

var progress_hook_decrypt = function(p) {
  var h, pr, _i, _len;
  var progressPercent = 0;
  if (progress.length && (progress[progress.length - 1].what === p.what)) {
    progress[progress.length - 1] = p;
  } else {
    progress.push(p);
  }
  h = "";
  for (_i = 0, _len = progress.length; _i < _len; _i++) {
    pr = progress[_i];
    h += "<li>" + pr.what + " " + pr.i + "/" + pr.total + "</li>";
    if (_i == 0) {
      progressPercent += (10.0 * (pr.i / pr.total));
    }
    else {
      progressPercent += (18.0 * (pr.i / pr.total));
    }
  }
  updateProgress(Math.floor(progressPercent));
  document.getElementById("progress-summary").innerHTML = h;
};

//////////////////////////////////////////////////////////////////////////////////// Read file stuff
var globalFileData = {name:"", type:"", data:""};
var fileDataRaw = "";

function readFileData(fileObj, callback) {
  var reader = new FileReader();

  reader.onload = (function(theFile) {
    return function(e) {
      callback(theFile.name, theFile.type, e.target.result);
    };
  })(fileObj);

  // Read in the image file as a data URL.
  // reader.readAsArrayBuffer
  reader.readAsDataURL(fileObj);
}

function getFileData() {
  var fileList = document.getElementById("uploadInput").files;
  var file1 = fileList[0];
  readFileData(file1, function (fileName, fileType, fileData) {
      fileDataRaw = fileData;
      globalFileData['name'] = fileName;
      globalFileData['type'] = fileType;
      globalFileData['data'] = fileData;
  });
}

// Drag and drop
// var dropzone = document.getElementById('dropzone')
// dropzone.ondragover = function () { this.className = 'hover'; return false; };
// dropzone.ondragend = function () { this.className = ''; return false; };
// dropzone.ondragleave = function () { this.className = ''; return false; };
// dropzone.ondrop = function (e) {
//   this.className = '';
//   e.preventDefault();
//   //readfiles(e.dataTransfer.files);
// }

//////////////////////////////////////////////////////////////////////////////////// Vault rendering
function getVaultTemplate(callback) {
  url = "vault.html"
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      callback(xhr.responseText);
    }
  }
  xhr.send();
}

function stripDataPrefix(dataUrl) {
  var firstCommaIndex = dataUrl.indexOf(',');
  return dataUrl.slice(firstCommaIndex+1);
}

function renderVault(fileName, fileType, fileData, callback) {
  getVaultTemplate(function (vaultTemplate) {
    // Replace the 3 placeholders with the file name, file type, and file data
    var vault = vaultTemplate.replace('REPLACE_WITH_FILE_NAME' + String.fromCharCode(95), fileName)
      .replace('REPLACE_WITH_FILE_TYPE' + String.fromCharCode(95), fileType)
      .replace('REPLACE_WITH_FILE_DATA' + String.fromCharCode(95), fileData);
    callback(vault);
  });
}

function saveVault(vaultData, vaultFileName) {
  var vaultBlob = new Blob([vaultData], {type: "text/html;charset=utf-8"});
  saveAs(vaultBlob, vaultFileName);
}

function createVault() {
  var password = document.getElementById('password_input').value;
  var base64FileData = stripDataPrefix(globalFileData['data']);

  encryptFileData(base64FileData, password, function (err, encryptedData) {
    renderVault(globalFileData['name'], globalFileData['type'], encryptedData, function (vaultData) {
      saveVault(vaultData, "vault1.html");
    });
  });
}

/////////////////////////////////////////////////////////////////////////////////// Encryption stuff
function encryptFileData(fileData, password, callback) {
  var data = new triplesec.Buffer(fileData);
  var key = new triplesec.Buffer(password);

  reset_progress();
  triplesec.encrypt({key:key, progress_hook: progress_hook_encrypt, data:data}, function (err, encryptedData) {
    if (err) {
      console.log('Encryption error: ' + err.toString());
    }
    else {
      callback(err, encryptedData.toString('base64'));
    }
  });
}

/////////////////////////////////////////////////////////////////////////////////// Decryption stuff
function decryptFileData(cipherData, password, callback) {
  var data = new triplesec.Buffer(cipherData, 'base64');
  var key = new triplesec.Buffer(password);

  reset_progress();
  triplesec.decrypt({key:key, progress_hook: progress_hook_decrypt, data:data}, function (err, plainData) {
    if (err) {
      console.log('Decryption error: ' + err.toString());
    }
    else {
      var plainDataBase64 = plainData.toString();     
      callback(err, plainDataBase64);
    }
  });
}

function decryptAndDownload() {
  var password = document.getElementById('password_input').value;
  decryptFileData(cipherData, password, function (err, plainData) {
    var blob = new Blob([Base64Binary.decode(plainData)], {
        type: fileType
    });
    saveAs(blob, fileName);
  });
}

///////////////////////////////////////////////////////////////////////////////////////// Validation

var encryptionFields = {};
function getEncryptionFields() {
  encryptionFields.password1 = document.getElementById('password_input');
  encryptionFields.password2 = document.getElementById('password_input2');
}

// TODO: Only call this if in encryption mode
getEncryptionFields();

function validateRequiredField(element, requiredMsgId) {
  if (element.value === '') {
    document.getElementById(requiredMsgId).style.display = 'block';
    return false;
  }
  else {
    document.getElementById(requiredMsgId).style.display = 'none';
    return true;
  }
}

function validatePasswordsMatch() {
  if (encryptionFields.password1.value == encryptionFields.password2.value) {
    document.getElementById('pw-mismatch-msg').style.display = 'none';
    return true;
  }
  else {
    document.getElementById('pw-mismatch-msg').style.display = 'block';
    return false;
  }
}

function validateEncryptionFields() {
  var allValid = true;
  allValid = validateRequiredField(encryptionFields.password1, 'pw-required-msg') && allValid;
  allValid = validateRequiredField(encryptionFields.password2, 'pw-required-msg2') && allValid;
  allValid = allValid && validatePasswordsMatch();
  return allValid;
}

function validateDecryption() {
  submitted = true;
  var valid = true;
  return valid;
}

