var nodemailer = require('nodemailer');
var path = require('path');
var aws = require('aws-sdk');

module.exports = function (Model, options) {
  aws.config.region = process.env.AWS_DEFAULT_REGION || 'us-west-2';
  var transporter = nodemailer.createTransport({
    SES: new aws.SES({
      apiVersion: '2010-12-01'
    })
  });

  //cloning because userInstance.verify accepts a mailer which has .send() function by default
  transporter.send = transporter.sendMail;

  Model.on('attached', function () {

    /**
     *
     */
    Model.app.get('/request-password-reset', function (request, response, next) {
      response.sendFile(path.join(__dirname + '/views/reset-password.html'));
    });

    /**
     *
     */
    Model.app.get('/confirm-password-reset', function (request, response, next) {
      response.sendFile(path.join(__dirname + '/views/confirm-password.html'));
    });

    /**
     *
     */
    Model.app.post('/request-password-reset', function (request, response, next) {
      Model.resetPassword({
        email: request.body.email,
        emailTemplate: request.body.emailTemplate
      }, function (err) {
        if (err) return response.status(401).send(err);
        else return response.status(200).send({
          statusCode: 200,
          message: 'We have sent you a email. Please check your email to reset your password'
        });
      });
    });

    /**
     *
     */
    Model.app.post('/confirm-password-reset', function (request, response, next) {
      if (!request.accessToken)
        return response.status(404).send({
          error: 'Incorrect Token',
          statusCode: 404,
          message: 'Valid token not found'
        });

      Model.findById(request.accessToken.userId, function (err, user) {
        if (err)
          return response.status(404).send(err);
        else {
          user.updateAttribute('password', request.body.password, function (err, res) {
            if (err) return response.status(404).send(err);
            return response.status(200).send({
              statusCode: 200,
              message: 'password reset processed successfully'
            });
          });
        }
      });
    });
  });

  Model.on('resetPasswordRequest', function (info) {
    var settings = Model.app.settings;
    var html;
    if(info.options.emailTemplate) {
      html = info.options.emailTemplate.replace('%s', info.accessToken.id);
    }
    else {
      html = 'Click on <a href="' + settings.protocol + '://' + settings.host + ':' + settings.port + '/confirm-password-reset?access_token=' + info.accessToken.id + '">this</a> url to reset your password';
    }
    transporter.sendMail({
      from: process.env.RESET_PASSWORD_EMAIL,
      to: info.user.email,
      subject: 'Password Reset Link',
      html: html
    }, function (err, success) {
      if (err)
        console.log('error from the mailer', err);
      else
        console.log('success from the mailer', success);
    });
  });

  // Model.observe('after save', function (ctx, next) {
  //   try {
  //     if (ctx.isNewInstance) {
  //       var verifyOptions = {
  //         type: 'email',
  //         to: ctx.instance.email,
  //         subject: 'Thanks for registering.',
  //         from: process.env.VERIFICATION_EMAIL,
  //         redirect: '/',
  //         user: ctx.instance,
  //         mailer: transporter
  //       };
  //       ctx.instance.verify(verifyOptions, function (err, obj) {
  //         if (err) {
  //           console.log('error from the mailer', err);
  //           next(err);
  //         }
  //         console.log('verification email sent:', obj);
  //       });
  //     }
  //     next();
  //   }
  //   catch (e) {
  //     console.log('error ', e);
  //     next(e);
  //   }
  // });

};
