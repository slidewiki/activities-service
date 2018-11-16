'use strict';

module.exports = {

  // splits the string identifier to {id, revision}
  parseIdentifier: function(identifier) {
    let parsed = String(identifier).match(/^(\d+)(?:-(\d+))?$/);

    // return nothing undefined if error
    if (!parsed) return;

    let result = { id: parseInt(parsed[1]) };

    // could be undefined, so don't parse (it would result to NaN)
    let revision = parsed[2] && parseInt(parsed[2]);
    if (revision) {
      result.revision = revision;
    }

    return result;
  },

  toIdentifier: function(ref) {
    // return nothing for null or invalid data
    if (!ref || !ref.id) return;

    let revision = ref.revision ? `-${ref.revision}` : '';
    return `${ref.id}${revision}`;
  },

};
