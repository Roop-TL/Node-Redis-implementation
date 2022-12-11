const express = require("express");
const axios = require("axios");
const cors = require("cors");
const Redis = require("redis");
const { promisifyAll } = require("bluebird");

promisifyAll(Redis);

//const client = Redis.createClient({url : }) // Pass the production instance url
//For localhost
const redisClient = Redis.createClient();

const DEFAULT_EXPIRATION = 3600;
const app = express();
app.use(cors());
const PORT = 3000;

const connection = async () => {
  await redisClient.connect();
};

connection();

app.get("/photos", async (req, res) => {
  const albumId = req.query.albumId;
  const cacheData = await redisClient.get(`photos?albumId=${albumId}`);
  if (cacheData) {
    console.log("Cache Hit");
    return res.status(200).send(JSON.parse(cacheData));
  } else {
    console.log("Cache Miss");
    const { data } = await axios.get(
      "http://jsonplaceholder.typicode.com/photos",
      { params: { albumId } }
    );
    await redisClient.SETEX(
      `photos?albumId=${albumId}`,
      DEFAULT_EXPIRATION,
      JSON.stringify(data)
    );
    return res.status(200).json(data);
  }
});

app.get(`/photos/:id`, async (req, res) => {
  const cacheData = await redisClient.get(`photos:${req.params.id}`);
  if (cacheData) {
    console.log("Cache Hit");
    return res.status(200).send(JSON.parse(cacheData));
  } else {
    const { data } = await axios.get(
      `http://jsonplaceholder.typicode.com/photos/${req.params.id}`
    );

    await redisClient.SETEX(
      `photos:${req.params.id}`,
      DEFAULT_EXPIRATION,
      JSON.stringify(data)
    );

    return res.status(200).json(data);
  }
});

//Make a callback functions

// function getOrSetCache(key, cb) {
//   return new Promise(async (resolve, reject) => {
//     await redisClient.get(key, async (error, data) => {
//       if (error) return reject(error);
//       if (data != null) return resolve(JSON.parse(data));
//       const freshData = await cb();
//       await redisClient.SETEX(
//         key,
//         DEFAULT_EXPIRATION,
//         JSON.stringify(freshData)
//       );
//       resolve(freshData);
//     });
//   });
// }

app.listen(PORT, () => {
  console.log(`App is listing on ${PORT}`);
});
