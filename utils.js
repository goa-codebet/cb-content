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

async function createAsset(
  client,
  url,
  fileName,
  contentType,
  locale = 'en-US'
) {
  console.log('createAsset');
  const asset = await client.createAsset({
    fields: {
      title: {
        [locale]: fileName,
      },
      file: {
        [locale]: {
          contentType,
          fileName,
          upload: url,
        },
      },
    },
  });

  return asset;
}

async function findOrCreateAsset(client, url, name, locale = 'en-US') {
  console.log('findOrCreateAsset');
  console.log('url: ', url);
  console.log('name: ', name);

  if (!url) return false;

  const parts = url.split('/');
  if (!parts) return false;

  const fileName = name || parts[parts.length - 1];
  if (!fileName) return false;

  const extention = fileName.split('.')[fileName.split('.').length - 1];
  if (!extention) return false;

  let contentType = 'image/' + extention;
  if (extention === 'jpg') contentType = 'image/jpeg';

  console.time(`Find or create asset: '${fileName}'`);

  let asset = null;

  try {
    if (entry_cache['asset' + _.kebabCase(fileName)]) {
      console.timeEnd(`Find or create asset: '${fileName}'`);
      return entry_cache['asset' + _.kebabCase(fileName)];
    }

    asset = await client.getAssets({
      'fields.file.fileName': fileName,
    });

    if (!asset.items || asset.items.length === 0) throw 'NotFound';

    asset = asset.items[0];

    console.timeEnd(`Find or create asset: '${fileName}'`);
  } catch (err) {
    if (!err.request || !err.request.res) console.log(err);

    if (err === 'NotFound' || err.request.res.statusCode === 404) {
      asset = await createAsset(
        client,
        'http:' + url,
        fileName,
        contentType,
        locale
      );
      asset = await asset.processForAllLocales();
      console.timeEnd(`Find or create asset: '${fileName}'`);
    }
  }

  // Cannot publish?? VersionMissMatch?
  if (asset.isUpdated() || !asset.isPublished()) asset = await asset.publish();

  entry_cache['asset' + _.kebabCase(fileName)] = asset;
  return asset;
}

createLink = item => ({
  sys: {
    type: 'Link',
    linkType: item.sys.type,
    id: item.sys.id,
  },
});

module.exports = {
  findOrCreateEntry,
  createEntry,
  findOrCreateAsset,
  createAsset,
  createLink,
};
