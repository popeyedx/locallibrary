const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const moment = require('moment');

const AuthorSchema = new Schema({
  first_name: {type: String, required: true, max: 100},
  family_name: {type: String, required: true, max: 100},
  date_of_birth: {type: Date},
  date_of_death: {type: Date}
});

/// mongooseではアロー関数を使用するとthisが使用できなくなるので注意

// 仮想プロパティ：author's full name
AuthorSchema
  .virtual('name')
  .get(function() {
    return `${this.family_name}, ${this.first_name}`;
  });

// 仮想プロパティ：author's lifespan
AuthorSchema
  .virtual('lifespan')
  .get(function() {
    if(!this.date_of_birth) {
      return `-`;
    } else if(!this.date_of_death) {
      return `${this.date_of_birth.getFullYear()} -`;
    } else {
      return `${this.date_of_birth.getFullYear()} - ${this.date_of_death.getFullYear()}`;
    }
  });
  
// 仮想プロパティ：author's url
AuthorSchema
  .virtual('url')
  .get(function() {
    return `/catalog/author/${this.id}`;
  });
  
AuthorSchema
  .virtual('date_of_birth_formatted')
  .get(function() {
    return this.date_of_birth ? moment(this.date_of_birth).format('YYYY-MM-DD') : '';
  });
  
AuthorSchema
  .virtual('date_of_death_formatted')
  .get(function() {
    return this.date_of_death ? moment(this.date_of_death).format('YYYY-MM-DD') : '';
  });

  
module.exports = mongoose.model('Author', AuthorSchema);