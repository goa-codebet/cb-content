const _ = require('lodash');

let entry_cache = {};

/**
 *
 */
async function createEntry(client, type, data) {
  return await client.createEntry(type, data);
}

/**
 *
 */
async function findOrCreateEntry(
  client,
  type,
  search,
  data,
  onlyCreate = false
) {
  const key = `Find or create ${type}: '${search}'`;
  console.time(key);

  let entry = null;

  try {
    if (entry_cache[type + search]) {
      console.log(`Found in cache`);
      console.timeEnd(key);
      return entry_cache[type + search];
    }
    entry = await client.getEntries({
      content_type: type,
      ['fields.identifier']: search,
    });
    if (!entry.items || entry.items.length === 0) throw 'NotFound';

    if (onlyCreate) {
      console.log(`Entry found, abort due to onlyCreate == true.`);
      return null;
    }

    entry = entry.items[0];

    console.log(`Found on remote`);
    console.timeEnd(key);
  } catch (err) {
    if (!err.request || !err.request.res) console.log(err);

    if (err === 'NotFound' || err.request.res.statusCode === 404) {
      entry = await createEntry(client, type, data);
      console.log(`Not found, created.`);
      console.timeEnd(key);
    }
  }

  if (entry.isUpdated() || !entry.isPublished()) entry = entry.publish();

  entry_cache[type + _.kebabCase(search)] = entry;
  return entry;
}

async function updateEntry(entry, fields) {
  var data = {
    identifier: Object.assign({}, entry.fields.identifier),
    translation: Object.assign(
      {},
      entry.fields.translation,
      fields.translation
    ),
  };

  entry.fields = data;
  entry = await entry.update();

  if (entry.isUpdated() || !entry.isPublished()) entry.publish();
}

module.exports = {
  findOrCreateEntry,
  createEntry,
  updateEntry,
};
