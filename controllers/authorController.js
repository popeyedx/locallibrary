const Author = require('../models/author');
const Book = require('../models/book');

const async = require('async');
const { body, validationResult, sanitizeBody } = require('express-validator');
// const { sanitizeBody } = require('express-validator/filter');


module.exports = {
  
  author_list: (req, res, next) => {
    Author.find()
      .sort({family_name: 'asc'})
      .then(list_authors => {
        res.render('author_list', {
          title: 'Author List',
          author_list: list_authors
        });
      })
      .catch(err => next(err));
  },
  
  author_detail: (req, res, next) => {
    const authorFunc = new Promise(function(resolve, reject){
      Author.findById(req.params.id)
        .then(author => resolve(author));
    });
    
    const authorsBooksFunc = new Promise(function(resolve, reject){
      Book.find({author: req.params.id}, 'title summary')
        .then(books => resolve(books));
    });
    
    const authorDetailFunc = async () => {
      const [author, authors_books] = await Promise.all([authorFunc, authorsBooksFunc]);
      return [author, authors_books];
    };
    
    authorDetailFunc()
      .then(([author, authors_books]) => {
        if(author === null) {
          const err = new Error('Author not found');
          err.status = 404;
          next(err);
        }
        res.render('author_detail', {
          title: 'Author Detail',
          author: author,
          author_books: authors_books
        });
      })
      .catch(err => next(err));
  },
  
  author_create_get: (req, res) => {
    res.render('author_form', {title: 'Create Author'});
  },
  
  author_create_post: [
    // バリデーション
    body('first_name')
      .isLength({min: 1})
      .trim()
      .withMessage('First name must be specified.')
      .isAlphanumeric()
      .withMessage('First name has non-alphanumeric characters.'),
      
    body('family_name')
      .isLength({min: 1})
      .trim()
      .withMessage('Family name must be specified.')
      .isAlphanumeric()
      .withMessage('Family name has non-alphanumeric characters.'),
      
    body('data_of_birth', 'Invalid date of birth')
      .optional({checkFalsy: true})   // 0やnull、空白をfalseではなくオプションとして見なす
      .isISO8601(),
      
    body('data_of_death', 'Invalid date of death')
      .optional({checkFalsy: true})   // 0やnull、空白をfalseではなくオプションとして見なす
      .isISO8601(),
      
    // サニタイズ
    sanitizeBody('first_name')
      .escape(),   // 「<」「>」「&」などを特殊文字に置き換える
      
    sanitizeBody('family_name')
      .escape(),
      
    sanitizeBody('date_of_birth')
      .toDate(),    // paramsは文字列扱いなので、日付型に変換
      
    sanitizeBody('date_of_death')
      .toDate(),
      
    (req, res, next) => {
      const errors = validationResult(req);
      if(!errors.isEmpty()) {
        res.render('author_form', {
          title: 'Create Author',
          author: req.body,
          errors: errors.array()
        });
        return;
      } else {
        // データが有効である場合
        const author = new Author({
          first_name: req.body.first_name,
          family_name: req.body.family_name,
          date_of_birth: req.body.date_of_birth,
          date_of_death: req.body.date_of_death
        });
        
        author.save()
          .then(() => res.redirect(author.url))
          .catch(err => next(err));
      }
    }

  ],
  
  author_delete_get: (req, res, next) => {
    async.parallel({
      author: function(callback) {
        Author.findById(req.params.id)
          .then(author => callback(null, author));
      },
      
      authors_books: function(callback) {
        Book.find({author: req.params.id})
          .then(books => callback(null, books));
      }
    })
      .then(results => {
        if(results.author === null) {
          res.redirect('/catalog/authors');
        }
        
        res.render('author_delete', {
          title: 'Delete Author',
          author: results.author,
          author_books: results.authors_books
        });
      })
      .catch(err => next(err));
  },
  
  author_delete_post: (req, res, next) => {
    async.parallel({
      author: function(callback) {
        Author.findById(req.body.authorid)
          .then(author => callback(null, author));
      },
      
      authors_books: function(callback) {
        Book.find({author: req.body.authorid})
          .then(books => callback(null, books));
      }
    })
      .then(results => {
        if(results.authors_books.length > 0) {
          res.render('author_delete', {
            title: 'Delete Author',
            author: results.author,
            author_books: results.authors_books
          });
        } else {
          Author.findByIdAndRemove(req.body.authorid)
            .then(() => res.redirect('/catalog/authors'))
            .catch(err => next(err));
        }
      })
      .catch(err => next(err));
  },
  
  author_update_get: (req, res) => {
    res.send('NOT IMPLEMENTED: Author update GET');
  },
  
  author_update_post: (req, res) => {
    res.send('NOT IMPLEMENTED: Author update POST');
  }
  
};