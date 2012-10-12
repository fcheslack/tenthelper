var request = require('request');
var qs = require('querystring');
var crypto = require('crypto');
var util = require('util');
var url = require('url');
var fs = require('fs');


//access_token becomes mac_key_id for app requests on the user's behalf

var tentApp;
tentApp = function(apiRoot, credentials){
    this.instance = 'tentApp';
    this.apiRoot = apiRoot;
    this.credentials = credentials;
    this.lastResponse = null;
};

tentApp.prototype.tentMime = 'application/vnd.tent.v0+json';


tentApp.prototype.hmacAuthHeader = function(mac_key_id, mac_key, method, uri){
    var parsedUri;
    if(typeof uri == 'string'){
        parsedUri = url.parse(uri);
    }
    else if(typeof uri == 'object') {
        parsedUri = uri;
    }
    var port = '80';
    if(parsedUri.protocol == 'https:'){
        port = '443';
    }
    if(parsedUri.port){
        port = parsedUri.port;
    }
    
    var timestamp = Math.floor(Date.now() / 1000);
    var nonce = Math.floor(Math.random() * Date.now());
    var ext = '';
    
    var msg = [timestamp.toString(), nonce.toString(), method, parsedUri.path, parsedUri.hostname, port.toString(), ext, ''].join("\n");
    console.log("input to hash: " + msg);
    
    var sha256 = crypto.createHmac('sha256', mac_key);
    var digest = sha256.update(msg).digest('base64');
    var authHeader = util.format('MAC id="%s" ts="%s" nonce="%s" mac="%s"', mac_key_id, timestamp, nonce, digest);
    console.log(authHeader);
    return authHeader;
};

tentApp.prototype.addMacHeader = function(request){
    var authHeader = this.hmacAuthHeader(this.credentials.access_mac_key_id, this.credentials.access_mac_key, request.method, request.uri);
    if(request.headers){
        request.headers['Authorization'] = authHeader;
    }
    else{
        request.headers = {
            'Authorization': authHeader
        };
    }
    return request;
};

tentApp.prototype.registerApp = function(callback){
    var tentApp = this;
    var appdata = {
        name: "LamaTent",
        description: 'Lama of Ruin Tent App',
        url: 'http://www.lamaofruin.com',
        icon: 'http://www.lamaofruin.com/icon.png',
        redirect_uris: ['http://localhost:3001/tent/callback'],
        scopes: {
            'read_profile': '*read profile',
            'write_profile': '*write profile',
            'read_followers': '*read followers',
            'write_followers': '*write followers',
            'read_followings': '*read followings',
            'write_followings': '*write followings',
            'read_posts': '*read posts',
            'write_posts': '*write posts'
        },
        mac_algorithm: 'hmac-sha-256'
    };
    
    var reqUri = this.apiRoot + '/apps';
    var reqOptions = {
        json: appdata,
        headers: {
            'Content-Type': this.tentMime,
            'Accept': this.tentMime
        }
    };
    request.post(reqUri, reqOptions, function(err, response, body){
        if(err){
            console.log("error: " + err);
        }
        console.log("BODY:");
        console.log(body);
        tentApp.lastResponse = response;
        callback(err, response);
    });
};

tentApp.prototype.authUrl = function(client_id, redirect_uri, scopes, state, profile_types, post_types){
    var aurl = url.parse(this.apiRoot + '/oauth/authorize');
    var scopeString;
    var profileTypesString;
    var postTypesString;
    
    if(typeof scopes == 'string'){
        scopeString = scopes;
    }
    else {
        scopeString = scopes.join(',');
    }
    
    if(typeof profile_types == 'string'){
        profileTypesString = profile_types;
    }
    else{
        profileTypeString = profile_types.join(',');
    }
    
    if(typeof post_types == 'string'){
        postTypesString = post_types;
    }
    else{
        postTypesString = post_types.join(',');
    }
    
    aurl.query = {
        client_id: client_id,
        redirect_uri: redirect_uri,
        scope: scopeString,
        state: state,
        tent_post_types: postTypesString,
        tent_profile_info_types: profileTypesString
    };
    return url.format(aurl);
};

tentApp.prototype.getAccessToken = function(code, callback){
    var tentApp = this;
    var reqUri = url.parse(util.format("%s/apps/%s/authorizations", this.apiRoot, this.credentials.appID));
    var reqData = {
        "code": code,
        "token_type": "mac"
    };
    
    var reqOptions = {
        method: 'POST',
        uri: reqUri,
        json:reqData,
        headers: {
            'Content-Type': this.tentMime,
            'Accept': this.tentMime
        }
    };
    reqOptions = this.addMacHeader(reqOptions);
    
    request.post(reqOptions, function(err, response, body){
        if(err !== null){
            console.log("error: " + err);
        }
        console.log("BODY:");
        console.log(body);
        tentApp.lastResponse = response;
        callback(err, response);
    });
};


tentApp.prototype.getPosts = function(params, callback){
    var tentApp = this;
    var reqUri = url.parse(util.format("%s/posts", this.apiRoot));
    reqUri.query = params;
    reqUri = url.parse(url.format(reqUri));
    
    var reqOptions = {
        method: 'GET',
        uri: reqUri,
        headers: {
            'Accept': this.tentMime
        }
    };
    reqOptions = this.addMacHeader(reqOptions);
    
    request.get(reqOptions, function(err, response, body){
        if(err !== null){
            console.log("error: " + err);
        }
        console.log("BODY:");
        console.log(body);
        tentApp.lastResponse = response;
        callback(err, response);
    });
};

tentApp.prototype.getPost = function(postid, params, callback){
    var reqUri = url.parse(util.format("%s/posts/%s", this.apiRoot, postid));
    reqUri.query = params;
    reqUri = url.parse(url.format(reqUri));
    
    var reqOptions = {
        method: 'GET',
        uri: reqUri,
        headers: {
            'Accept': this.tentMime
        }
    };
    reqOptions = this.addMacHeader(reqOptions);
    
    request.get(reqOptions, function(err, response, body){
        if(err !== null){
            console.log("error: " + err);
        }
        console.log("BODY:");
        console.log(body);
        tentApp.lastResponse = response;
        callback(err, response);
    });
};

tentApp.prototype.postStatus = function(message, callback){
    var nowSeconds = Math.floor(Date.now() / 1000);
    var reqUri = url.parse(this.apiRoot + '/posts');
    
    var postObject = {
        "type": "https://tent.io/types/post/status/v0.1.0",
        "published_at": nowSeconds,
        "permissions": {
            "public": true
        },
        "licenses": [
            "http://creativecommons.org/licenses/by/3.0/"
        ],
        "content": {
            "text": message
        }
    };
    
    var reqOptions = {
        method:'POST',
        uri: reqUri,
        headers: {
            'Content-Type': 'application/vnd.tent.v0+json',
            'Accept': 'application/vnd.tent.v0+json'
        },
        json: postObject
    };
    reqOptions = this.addMacHeader(reqOptions);
    
    request.post(reqUri, reqOptions, function(err, response, body){
        if(err !== null){
            console.log("error: " + err);
        }
        console.log("BODY:");
        console.log(body);
        tentApp.lastResponse = response;
        callback(err, response);
    });
};

tentApp.prototype.getProfile = function(callback){
    var reqUri = url.parse(util.format("%s/profile", this.apiRoot));
    var reqOptions = {
        method: 'GET',
        uri: reqUri,
        headers: {
            'Accept': this.tentMime
        }
    };
    reqOptions = this.addMacHeader(reqOptions);
    
    request.get(reqOptions, function(err, response, body){
        if(err !== null){
            console.log("error: " + err);
        }
        console.log("BODY:");
        console.log(body);
        tentApp.lastResponse = response;
        callback(err, response);
    });
};

//basic profile type: https://tent.io/types/info/basic/v0.1.0
tentApp.prototype.putProfile = function(type, profileObject, callback){
    var reqUri = url.parse(util.format("%s/profile/%s", this.apiRoot, encodeURIComponent(type)));
    var reqOptions = {
        method: 'PUT',
        uri: reqUri,
        headers: {
            'Accept': this.tentMime
        },
        json: profileObject
    };
    reqOptions = this.addMacHeader(reqOptions);
    
    request.put(reqOptions, function(err, response, body){
        if(err !== null){
            console.log("error: " + err);
        }
        console.log("BODY:");
        console.log(body);
        tentApp.lastResponse = response;
        callback(err, response);
    });
};

tentApp.prototype.postFollowings = function(entity, params, callback){
    var reqUri = url.parse(util.format("%s/followings", this.apiRoot));
    var reqOptions = {
        method: 'POST',
        uri: reqUri,
        headers: {
            'Accept': this.tentMime
        },
        json: {'entity': entity}
    };
    reqOptions = this.addMacHeader(reqOptions);
    
    request.post(reqOptions, function(err, response, body){
        if(err !== null){
            console.log("error: " + err);
        }
        console.log("BODY:");
        console.log(body);
        tentApp.lastResponse = response;
        callback(err, response);
    });
};

tentApp.prototype.getFollowings = function(params, callback){
    var reqUri = url.parse(util.format("%s/followings", this.apiRoot));
    reqUri.query = params;
    reqUri = url.parse(url.format(reqUri));
    var reqOptions = {
        method: 'GET',
        uri: reqUri,
        headers: {
            'Accept': this.tentMime
        }
    };
    reqOptions = this.addMacHeader(reqOptions);
    
    request.get(reqOptions, function(err, response, body){
        if(err !== null){
            console.log("error: " + err);
        }
        console.log("BODY:");
        console.log(body);
        tentApp.lastResponse = response;
        callback(err, response);
    });
};

tentApp.prototype.getFollowing = function(followingid, callback){
    var reqUri = url.parse(util.format("%s/followings/%s", this.apiRoot, followingid));
    var reqOptions = {
        method: 'GET',
        uri: reqUri,
        headers: {
            'Accept': this.tentMime
        }
    };
    reqOptions = this.addMacHeader(reqOptions);
    
    request.get(reqOptions, function(err, response, body){
        if(err !== null){
            console.log("error: " + err);
        }
        console.log("BODY:");
        console.log(body);
        tentApp.lastResponse = response;
        callback(err, response);
    });
};

tentApp.prototype.deleteFollowing = function(followingid, callback){
    var reqUri = url.parse(util.format("%s/followings/%s", this.apiRoot, followingid));
    var reqOptions = {
        method: 'DELETE',
        uri: reqUri,
        headers: {
            'Accept': this.tentMime,
            'Authorization': authHeader
        }
    };
    reqOptions = this.addMacHeader(reqOptions);
    
    request.delete(reqOptions, function(err, response, body){
        if(err !== null){
            console.log("error: " + err);
        }
        console.log("BODY:");
        console.log(body);
        tentApp.lastResponse = response;
        callback(err, response);
    });
};

//params: before_id, since_id, limit
tentApp.prototype.getFollowers = function(params, callback){
    var reqUri = url.parse(util.format("%s/followers", this.apiRoot));
    reqUri.query = params;
    reqUri = url.parse(url.format(reqUri));
    var reqOptions = {
        method: 'GET',
        uri: reqUri,
        headers: {
            'Accept': this.tentMime
        }
    };
    reqOptions = this.addMacHeader(reqOptions);
    
    request.get(reqOptions, function(err, response, body){
        if(err !== null){
            console.log("error: " + err);
        }
        console.log("BODY:");
        console.log(body);
        tentApp.lastResponse = response;
        callback(err, response);
    });
};

tentApp.prototype.getFollower = function(followerid, callback){
    var reqUri = url.parse(util.format("%s/followers/%s", this.apiRoot, followerid));
    var reqOptions = {
        method: 'GET',
        uri: reqUri,
        headers: {
            'Accept': this.tentMime
        }
    };
    reqOptions = this.addMacHeader(reqOptions);
    
    request.get(reqOptions, function(err, response, body){
        if(err !== null){
            console.log("error: " + err);
        }
        console.log("BODY:");
        console.log(body);
        tentApp.lastResponse = response;
        callback(err, response);
    });
};

tentApp.prototype.deleteFollower = function(followerid, callback){
    var reqUri = url.parse(util.format("%s/followers/%s", this.apiRoot, followerid));
    var reqOptions = {
        method: 'DELETE',
        uri: reqUri,
        headers: {
            'Accept': this.tentMime
        }
    };
    reqOptions = this.addMacHeader(reqOptions);
    
    request.delete(reqOptions, function(err, response, body){
        if(err !== null){
            console.log("error: " + err);
        }
        console.log("BODY:");
        console.log(body);
        tentApp.lastResponse = response;
        callback(err, response);
    });
};

tentApp.prototype.postPost = function(newPost, callback){
    var reqUri = url.parse(this.apiRoot + '/posts');
    
    var reqOptions = {
        method: 'POST',
        uri: reqUri,
        headers: {
            'Content-Type': 'application/vnd.tent.v0+json',
            'Accept': 'application/vnd.tent.v0+json'
        },
        json: newPost
    };
    reqOptions = this.addMacHeader(reqOptions);
    
    request.post(reqUri, reqOptions, function(err, response, body){
        if(err !== null){
            console.log("error: " + err);
        }
        console.log("BODY:");
        console.log(body);
        tentApp.lastResponse = response;
        callback(err, response);
    });
};

tentApp.prototype.getPostAttachment = function(postid, attachmentName, callback){
    var reqUri = url.parse(util.format("%s/posts/%s/attachments/%s", this.apiRoot, postid, attachmentName));
    var reqOptions = {
        method: 'GET',
        uri: reqUri,
        headers: {
            'Accept': this.tentMime
        }
    };
    reqOptions = this.addMacHeader(reqOptions);
    
    request.get(reqOptions, function(err, response, body){
        if(err !== null){
            console.log("error: " + err);
        }
        console.log("BODY:");
        console.log(body);
        tentApp.lastResponse = response;
        callback(err, response);
    });
};


exports.tentApp = tentApp;



// .load ./tentrequests.js
