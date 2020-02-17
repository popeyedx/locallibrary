const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const BookInstance = require('../models/bookinstance');

const async = require('async');
const { body, validationResult, sanitizeBody } = require('express-validator');

exports.index = (req, res) => {
  async.parallel({
    // 以下の関数は同時に実行される
    book_count: function(callback) {
      Book.countDocuments({}, callback);    // 空のオブジェクトを渡すことで全てのドキュメントをカウント
    },
    
    book_instance_count: function(callback) {
      BookInstance.countDocuments({}, callback);
    },
    
    book_instance_available_count: function(callback) {
      BookInstance.countDocuments({status: 'Available'}, callback);
    },
    
    author_count: function(callback) {
      Author.countDocuments({}, callback);
    },
    
    genre_count: function(callback) {
      Genre.countDocuments({}, callback);
    }
  }, (err, results) => {
    res.render('index', {
      title: 'Local Library Home',
      error: err,
      data: results
    });
  });
  
//     .then(results => {
//         res.render('index', {
//             title: 'Local Library Home',
//             data: results
//         });
//     })
//     .catch(err => console.log(err));
  
};

// Display list of all books.
exports.book_list = function(req, res, next) {
  Book.find({}, 'title author')   // title, authorのみ抽出
    .populate('author')
    .then(list_books => {
      res.render('book_list', {
        title: 'Book List',
        book_list: list_books
      });
    })
    .catch(err => next(err));
};

// Display detail page for a specific book.
exports.book_detail = function(req, res, next) {
  const bookFunc = new Promise(function(resolve, reject) {
    Book.findById(req.params.id)
      .populate('author')
      .populate('genre')
      .then(book => {
        resolve(book);
      });
  });

  const bookinstanceFunc = new Promise(function(resolve, reject) {
    BookInstance.find({book: req.params.id})
      .then(bookinstances => {
        resolve(bookinstances);
      });
  });
  
  const bookdetailFunc = async () => {
    const [book, bookinstance] = await Promise.all([bookFunc, bookinstanceFunc]);
    return [book, bookinstance];
  };
  
  bookdetailFunc()
    .then(([book, bookinstance]) => {
      if(book === null) {
        const err = new Error('Book not found');
        err.status = 404;
        next(err);
      }
      
      res.render('book_detail', {
        title:  book.title,
        book: book,
        book_instances: bookinstance
      });
    })
    .catch(err => next(err));
};

// Display book create form on GET.
exports.book_create_get = function(req, res, next) {
  const authorsFunc = new Promise((resolve, reject) => {
    Author.find()
      .then(authors => resolve(authors));
  });
  
  const genresFunc = new Promise(resolve => {
    Genre.find()
      .then(genres => resolve(genres));
  });
  
  const book_create_get_func = async () => {
    const [authors, genres] = await Promise.all([authorsFunc, genresFunc]);
    return [authors, genres];
  };
  
  book_create_get_func()
    .then(([authors, genres]) => {
      res.render('book_form', {
        title: 'Create Book',
        authors,
        genres
      });
    })
    .catch(err => next(err));
};

// Handle book create on POST.
exports.book_create_post = [
  // genreを配列化
  (req, res, next) => {
    if(!(req.body.genre instanceof Array)) {
      if(typeof req.body.genre === 'undefined') {
        req.body.genre = [];
        console.log('test1', req.body.genre);
      } else {
        req.body.genre = new Array(req.body.genre);
      }
    }
    next();
  },
  
  // バリデーション
  body('title', 'Title must not be empty.')
    .isLength({min: 1})
    .trim(),
    
  body('author', 'Author must not be empty.')
    .isLength({min: 1})
    .trim(),

  body('summary', 'Summary must not be empty.')
    .isLength({min: 1})
    .trim(),
    
  body('isbn', 'ISBN must not be empty')
    .isLength({min: 1})
    .trim(),
    
  /////// 追加
  body('genre', 'Genre must not be empty')
    .isLength({min: 1})
    .trim(),
  //////  追加ここまで
    
  // サニタイズ（無害化）-> ワイルドカードを使用
  sanitizeBody('*')
    .escape(),
    
  (req, res, next) => {
    const errors = validationResult(req);
    
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre
    });
    
    console.log(!req.body.genre);

    
    if(!errors.isEmpty()) {
      async.parallel({
        authors: function(callback) {
          Author.find()
            .then(authors => callback(null, authors));
        },
        
        genres: function(callback) {
          Genre.find()
            .then(genres => callback(null, genres));
        }
      })
        .then(results => {
          for (let i = 0; i < results.genres.length; i++) {
            if(book.genre.indexOf(results.genres[i].id) > -1) {
              results.genres[i].checked = 'true';
            }
          }

          res.render('book_form', {
            title: 'Create Book',
            authors: results.authors,
            genres: results.genres,
            book: book,
            errors: errors.array()
          });
        })
        .catch(err => next(err));
    } else {
      book.save()
        .then(() => res.redirect(book.url))
        .catch(err => next(err));
    }
  }
];

// Display book delete form on GET.
exports.book_delete_get = function(req, res) {
    res.send('NOT IMPLEMENTED: Book delete GET');
};

// Handle book delete on POST.
exports.book_delete_post = function(req, res) {
    res.send('NOT IMPLEMENTED: Book delete POST');
};

// Display book update form on GET.
exports.book_update_get = function(req, res, next) {
    async.parallel({
      book: function(callback) {
        Book.findById(req.params.id)
          .then(book => callback(null, book));
      },
      
      authors: function(callback) {
        Author.find()
          .then(authors => callback(null, authors));
      },
      
      genres: function(callback) {
        Genre.find()
          .then(genres => callback(null, genres));
      }
    })
      .then(results => {
        if(results.book === null) {
          const err = new Error('Book not found');
          err.status = 404;
          return next(err);
        }
        
        for (let i = 0; i < results.genres.length; i++) {
          for (var j = 0; j < results.book.genre.length; j++) {
            if(results.genres[i].id.toString() === results.book.genre[j].id.toString()) {
              results.genres[i].checked = 'true';
            }
          }
        }
        
        res.render('book_form', {
          title: 'Update Book',
          authors: results.authors,
          genres: results.genres,
          book: results.book
        });
      })
      .catch(err => next(err));
};

// Handle book update on POST.
exports.book_update_post = [
  // genreを配列化する
  (req, res, next) => {
    if(!(req.body.genre instanceof Array)) {
      if(typeof req.body.genre === 'undefined') {
        req.body.genre = [];
      } else {
        req.body.genre = new Array(req.body.genre);
      }
    }
    next();
  },
  
  // バリデーション
  body('title', 'Title must not be empty.')
    .isLength({min: 1})
    .trim(),
    
  body('author', 'Author must not be empty.')
    .isLength({min: 1})
    .trim(),
    
  body('summary', 'Summary must not be empty.')
    .isLength({min: 1})
    .trim(),

  body('isbn', 'ISBN must not be empty.')
    .isLength({min: 1})
    .trim(),

  // サニタイズ（無害化）
  sanitizeBody('title').escape(),
  
  sanitizeBody('author').escape(),
  
  sanitizeBody('summary').escape(),
  
  sanitizeBody('isbn').escape(),
  
  sanitizeBody('genre.*').escape(),
  
  (req, res, next) => {
    const errors = validationResult(req);
    
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: (typeof req.body.genre === 'undefined' ? [] : req.body.genre),
      _id: req.params.id
    });
    
    if(!errors.isEmpty()) {
      async.parallel({
        authors: function(callback) {
          Author.find()
            .then(authors => callback(null, authors));
        },
        
        genres: function(callback) {
          Genre.find()
            .then(genres => callback(null, genres));
        }
      })
        .then(results => {
          for (let i = 0; i < results.genres.length; i++) {
            if(book.genre.indexOf(results.genres[i].id) > -1) {
              results.genres[i].checked = 'true';
            }
          }
          
          res.render('book_form', {
            title: 'Update Book',
            authors: results.authors,
            genres: results.genres,
            book,
            errors: errors.array()
          });
        })
        .catch(err => next(err));
    } else {
      Book.findByIdAndUpdate(req.params.id, book)
        .then(book => res.redirect(book.url))
        .catch(err => next(err));
    }
  }
];