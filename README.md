tenthelper
==========

Nodejs helper to interact with a tent server.

example credentials object:

    {
        "appID": "xxxxxx",
        "app_mac_key_id": "xxxxxx",
        "app_mac_key": "xxxxxxxxxxxxxxxxxxxxx",
        "app_mac_algorithm": "hmac-sha-256",
        "access_token": "xxxxxxx",
        "access_mac_key_id": "xxxxxxx",
        "access_mac_key": "xxxxxxxxxxxxxxxxxxxxx",
        "access_mac_algorithm": "hmac-sha-256",
        "access_token_type": "mac"
    }

Posting a status

    var fs = require('fs');
    var tentApp = require('./tent.js').tentApp;
    var fcpCredentials = JSON.parse(fs.readFileSync('./fcpCredentials.json', 'utf8') );
    
    var fcpTentApp = new tentApp('https://fcp.tent.is/tent', fcpCredentials);
    fcpTentApp.postStatus("Tent Status Message", function(){});
    