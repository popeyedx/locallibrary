const Genre = require('../models/genre');
const Book = require('../models/book');

const async = require('async');
const validator = require('express-validator');

// Display list of all Genre.
exports.genre_list = function(req, res, next) {
  Genre.find()
    .sort({name: 'asc'})
    .then(list_genres => {
      res.render('genre_list', {
        title: 'Genre List',
        genre_list: list_genres
      });
    })
    .catch(err => next(err));
};

// 特定ジャンルの詳細ページを表示
exports.genre_detail = function(req, res, next) {
  async.parallel({
    genre: function(callback) {
      Genre.findById(req.params.id)
        // .exec(callback);
        .then(genre => callback(null, genre));
    },
    
    genre_books: function(callback){
      Book.find({genre: req.params.id})
        .exec(callback);
    }
  })
    .then(results => {
      if(results.genre === null) {
        const err = new Error('Genre not found');
        err.status = 404;
        return next(err);
      }
      res.render('genre_detail', {
        title: 'Genre Details',
        genre: results.genre,
        genre_books: results.genre_books
      });
    })
    .catch(err => next(err));
};

// Display Genre create form on GET.
exports.genre_create_get = function(req, res, next) {
  res.render('genre_form', {
    title: 'Create Genre'
  });
};

// Handle Genre create on POST.
exports.genre_create_post = [
  validator.body('name', 'Genre name required')
    .isLength({min: 1})
    .trim(),
    
  validator.sanitizeBody('name').escape(),
  
  (req, res, next) => {
    const errors = validator.validationResult(req);

    const genre = new Genre({name: req.body.name});
    if(!errors.isEmpty()) {
      res.render('genre_form', {
        title: 'Create Genre',
        genre: genre,
        errors: errors.array()
      });
      return;
    } else {
      // データが有効だった場合
      Genre.findOne({name: req.body.name})
        .then(found_genre => {
          // ジャンル名が存在する場合
          if(found_genre) {
            res.redirect(found_genre.url);
          } else {
            genre.save()
              .then(() => res.redirect(genre.url))
              .catch(err => next(err));
          }
        })
        .catch(err => next(err));
    }
  }
];

// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res) {
  res.send('NOT IMPLEMENTED: Genre delete GET');
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res) {
  res.send('NOT IMPLEMENTED: Genre delete POST');
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res) {
  res.send('NOT IMPLEMENTED: Genre update GET');
};

// Handle Genre update on POST.
exports.genre_update_post = function(req, res) {
  res.send('NOT IMPLEMENTED: Genre update POST');
};