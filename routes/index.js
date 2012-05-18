var fs = require('fs')
, path = require('path')
, crypto = require('crypto')
, mime = require('mime-magic')
, HTTPStatus = require('http-status')
, uuid = require('node-uuid')
, thumper = require('../lib/thumper.js')
, image_storage = require('../lib/image_storage.js')
, user_images = require('../lib/user_images.js')
, user_interactions = require('../lib/user_interactions.js')
;

function sendCreatedPath(res, path) {
    res.send('', {'Location': path}, HTTPStatus.CREATED);
}

function sendFile(res, data, mime, code) {
    res.send(data, { 'Content-Type': mime }, code);
}

function generateNewFileName() {
    return crypto.createHash('md5').update(uuid.v4()).digest("hex");
}

/*
 * GET home page.
 */
exports.index = function(req, res) {
    // TODO remove magick numbers. Move them to configuraion
    var username = req.session.user ? req.session.user.name : null;
    user_images.getLatestImages(0, 49, function(error, data) {
        res.render('image_list', { title: 'Cloudstagram', data: data, username: username });
    });
};

exports.userImages = function(req, res) {
    var username = req.session.user ? req.session.user.name : null;
    // TODO remove magick numbers. Move them to configuraion
    user_images.getUserImages(req.params.userid, 0, 49, function(error, data) {
        res.render('image_list', { title: 'Cloudstagram', data: data, username: username });
    });
};

/*
 * POST handles image upload
 */
exports.upload = function(req, res, next) {
    var tmpPath = req.files.image.path;
    var comment = req.body.comment || "";
    var filename = generateNewFileName();
    var username = req.session.user.name;

    mime.fileWrapper(tmpPath, function (error, mime) {
        image_storage.storeFile(tmpPath, filename, mime, function(error, data) {
            if (error) {
                console.log(error);
                //TODO show error back in the form.
            } else {
                fs.unlink(tmpPath);
                thumper.publishMessage('cloudstagram-upload', {
                    userid: username, 
                    filename: data.filename,
                    comment: comment,
                    uploaded: Date.now()
                }, '');
                res.redirect('back');
            }
        });
    });
};

exports.serveFile = function(req, res, next) {
    console.log("size: ", req.param('size'));
    var filename = req.param('size') == 'small' ? 'small_' + req.params.id : req.params.id;
    image_storage.readGsFile(filename, function(error, gsData) {
        sendFile(res, gsData.binary, gsData.gsObject.contentType, HTTPStatus.OK);
    });
};

exports.likeImage = function(req, res, next) {
    var username = req.session.user.name;
    var imageid = req.params.imageid;
    user_images.likeImage(username, imageid, function(error, data){
        if (error) {
            res.send(500);
        } else {
            res.send(204);
        }
    });
}

exports.followUser = function(req, res, next) {
    var from = req.session.user.name;
    var target = req.params.userid;
    user_interactions.followUser(from, target, function(error, data) {
        if (error) {
            res.send(500);
        } else {
            res.send(204);
        }        
    });
}