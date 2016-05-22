'use strict';

var request  = require('supertest');
var slug     = require('slug');
var when     = require('when');
var models   = require('../../api/models');
var fixtures = require('../../utils/fixtures');

require('../../utils/createAuthenticatedSuite')('Controller: Playlist', function() {

  var url = 'http://localhost:3000/v1/';

  it('should return a single playlist', function(done) {
    var titleSlug = slug(fixtures.playlists[0].title).toLowerCase();
    var req = request(url).get('playlist/' + titleSlug);

    req.cookies = global.cookies;

    req.end(function(err, res) {
      res.status.should.be.equal(200);
      res.body.should.be.instanceof(Object);
      res.body.data.should.be.instanceof(Object);
      res.body.data.should.have.property('title');
      res.body.data.should.have.property('slug');
      res.body.data.should.have.property('tags');
      res.body.data.should.have.property('privacy');
      res.body.data.should.have.property('playCount');
      res.body.data.should.have.property('likeCount');
      res.body.data.should.have.property('Tracks');
      res.body.data.should.have.property('Comments');
      res.body.data.should.have.property('Followers');
      res.body.data.should.have.property('Likes');
      res.body.data.should.have.property('collaborators');
      res.body.data.Tracks.should.be.instanceof(Array);
      done();
    });
  });

  it('should return playlists matching a search query and record the search', function(done) {
    var req = request(url).get('playlists/search/test');

    sandbox.mock(models.PlaylistSearch).expects('create').returns(when()).once();

    req.cookies = global.cookies;

    req.end(function(err, res) {
      res.status.should.be.equal(200);
      res.body.data.should.be.instanceof(Array);
      res.body.data[0].should.have.property('title');
      res.body.data[0].should.have.property('slug');
      res.body.data[0].should.have.property('tags');
      res.body.data[0].should.have.property('privacy');
      done();
    });
  });

  it('should return an array of trending playlists', function(done) {
    var req = request(url).get('playlists/trending');

    req.cookies = global.cookies;

    req.end(function(err, res) {
      res.status.should.be.equal(200);
      res.body.data.should.be.instanceof(Array);
      res.body.data[0].should.have.property('title');
      res.body.data[0].should.have.property('slug');
      res.body.data[0].should.have.property('tags');
      res.body.data[0].should.have.property('privacy');
      res.body.data[0].should.have.property('playCount');
      res.body.data[0].should.have.property('likeCount');
      done();
    });
  });

  it('should return an array of newest playlists', function(done) {
    var req = request(url).get('playlists/newest');

    req.cookies = global.cookies;

    req.end(function(err, res) {
      res.status.should.be.equal(200);
      res.body.data.should.be.instanceof(Array);
      res.body.data[0].should.have.property('title');
      res.body.data[0].should.have.property('slug');
      res.body.data[0].should.have.property('tags');
      res.body.data[0].should.have.property('privacy');
      res.body.data[0].should.have.property('playCount');
      res.body.data[0].should.have.property('likeCount');
      done();
    });
  });

  it('should return an array of recent playlist searches', function(done) {
    var req = request(url).get('playlists/searches');

    req.cookies = global.cookies;

    req.end(function(err, res) {
      res.status.should.be.equal(200);
      res.body.should.be.instanceof(Object);
      res.body.should.have.property('data');
      res.body.data.should.be.instanceof(Array);
      res.body.data[0].should.have.property('UserId');
      res.body.data[0].should.have.property('results');
      res.body.data[0].should.have.property('query');
      done();
    });
  });

  it('should return an array of recently played playlists', function(done) {
    var req = request(url).get('playlists/played/recent');

    req.cookies = global.cookies;

    req.end(function(err, res) {
      res.status.should.be.equal(200);
      res.body.data.should.be.instanceof(Array);
      res.body.data[0].should.have.property('title');
      res.body.data[0].should.have.property('slug');
      res.body.data[0].should.have.property('tags');
      res.body.data[0].should.have.property('privacy');
      res.body.data[0].should.have.property('playCount');
      res.body.data[0].should.have.property('likeCount');
      done();
    });
  });

  it('should successfully create a new playlist', function(done) {
    var req = request(url).post('playlist');
    var playlist = {
      ownerId: 1,
      ownerType: 'group',
      title: 'Playlist for Tests',
      tags: ['test', 'automated', 'new'],
      privacy: 'public'
    };

    req.cookies = global.cookies;

    req.send(playlist).end(function(err, res) {
      res.status.should.be.equal(200);
      res.body.should.be.instanceof(Object);
      res.body.data.should.be.instanceof(Object);
      res.body.data.should.have.property('title');
      res.body.data.should.have.property('slug');
      res.body.data.should.have.property('tags');
      res.body.data.should.have.property('privacy');
      done();
    });
  });

  it('should update a specific group\'s attributes', function(done) {
    var req = request(url).patch('playlist/1');
    var updates = {
      title: 'new title'
    };

    req.cookies = global.cookies;

    req.send(updates).end(function(err, res) {
      res.status.should.be.equal(200);
      res.body.should.be.instanceof(Object);
      res.body.data.should.be.instanceof(Object);
      res.body.data.should.have.property('title');
      res.body.data.should.have.property('slug');
      res.body.data.should.have.property('privacy');
      res.body.data.should.have.property('Owner');
      res.body.data.should.have.property('Collaborators');
      res.body.data.title.should.be.equal(updates.title);
      done();
    });
  });

  it('should reorder all passed tracks', function(done) {
    var req = request(url).post('playlist/1/reorder');
    var updates = [
      {
        track: Object.assign({}, fixtures.tracks[0], { id: 0 }),
        newIndex: 0
      },
      {
        track: Object.assign({}, fixtures.tracks[1], { id: 1 }),
        newIndex: 1
      },
      {
        track: Object.assign({}, fixtures.tracks[2], { id: 2 }),
        newIndex: 2
      },
      {
        track: Object.assign({}, fixtures.tracks[3], { id: 3 }),
        newIndex: 3
      }
    ];

    req.cookies = global.cookies;

    req.send(updates).end(function(err, res) {
      res.status.should.be.equal(200);
      res.body.data.should.be.instanceof(Array);
      res.body.data[0].should.have.property('title');
      res.body.data[0].should.have.property('source');
      res.body.data[0].should.have.property('sourceParam');
      res.body.data[0].should.have.property('order');
      res.body.data[0].order.should.be.lessThan(res.body.data[1].order);
      done();
    });
  });

  it('should successfully record a play', function(done) {
    var req = request(url).post('playlist/1/play');

    req.cookies = global.cookies;

    req.end(function(err, res) {
      res.status.should.be.equal(200);
      res.body.should.be.instanceof(Object);
      res.body.data.should.be.instanceof(Object);
      res.body.data.should.have.property('PlaylistId');
      res.body.data.should.have.property('UserId');
      done();
    });
  });

  it('should successfully follow a playlist', function(done) {
    var req = request(url).post('playlist/1/follow');

    req.cookies = global.cookies;

    req.end(function(err, res) {
      res.status.should.be.equal(200);
      done();
    });
  });

  it('should successfully like a playlist', function(done) {
    var req = request(url).post('playlist/1/like');

    req.cookies = global.cookies;

    req.end(function(err, res) {
      res.status.should.be.equal(200);
      done();
    });
  });

  it('should successfully add a collaborator', function(done) {
    var req = request(url).post('playlist/1/collaborator/3');

    req.cookies = global.cookies;

    req.end(function(err, res) {
      res.status.should.be.equal(200);
      res.body.should.be.instanceof(Object);
      res.body.data.should.be.instanceof(Object);
      res.body.data.should.have.property('PlaylistId');
      res.body.data.should.have.property('UserId');
      done();
    });
  });

  it('should successfully remove a collaborator', function(done) {
    var req = request(url).delete('playlist/1/collaborator/3');

    sandbox.mock(models.Collaboration.Instance.prototype)
    .expects('destroy').once().returns(when());

    req.cookies = global.cookies;

    req.end(function(err, res) {
      res.status.should.be.equal(200);
      done();
    });
  });

  it('should successfully add a track', function(done) {
    var req = request(url).post('playlist/1/track');
    var track = {
      title: 'Test Track',
      artist: 'Test',
      source: 'soundcloud',
      sourceParam: 'sfsd234zxew'
    };

    req.cookies = global.cookies;

    req.send(track).end(function(err, res) {
      res.status.should.be.equal(200);
      res.body.should.be.instanceof(Object);
      res.body.data.should.be.instanceof(Object);
      res.body.data.should.have.property('title');
      res.body.data.should.have.property('slug');
      res.body.data.should.have.property('tags');
      res.body.data.should.have.property('privacy');
      done();
    });
  });

  it('should successfully remove a track', function(done) {
    var req = request(url).delete('playlist/1/track/2');

    sandbox.mock(models.Track.Instance.prototype)
    .expects('destroy').returns(when());

    req.cookies = global.cookies;

    req.end(function(err, res) {
      res.status.should.be.equal(200);
      done();
    });
  });

  it('should successfully delete a playlist', function(done) {
    var req = request(url).delete('playlist/2');

    sandbox.mock(models.Playlist.Instance.prototype)
    .expects('destroy').once().returns(when());

    req.cookies = global.cookies;

    req.end(function(err, res) {
      res.status.should.be.equal(200);
      done();
    });
  });

});
