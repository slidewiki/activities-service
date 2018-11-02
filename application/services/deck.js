'use strict';

const rp = require('request-promise-native');
const Microservices = require('../configs/microservices');

const self = module.exports = {

  // promises deck/slide data
  fetchContentItem: function(kind, id, rootId) {
    let uri = `${Microservices.deck.uri}/${kind}/${id}`;
    if (rootId) {
      uri += `?root=${rootId}`;
    }

    return rp.get({
      uri,
      json: true,
    }).then((item) => {
      // TODO these should be removed after we have a sane deck/slide response model
      if (item.revisions && item.revisions.length) {
        // if more than one, we want the last; otherwise, it's just one (also the last)
        let [last] = item.revisions.slice(-1);
        Object.assign(item, last);
      }
      item.id = item._id;

      delete item._id;
      delete item.revisions;

      return item;
    }).catch((err) => {
      // return nothing if not found
      if (err.statusCode === 404) return;
      throw new Error(`could not read ${kind} ${id}`);
    });

  },

};
