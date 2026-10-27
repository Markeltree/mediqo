const mongoose = require('mongoose');

let connecting = null;

/** Connects once per process and reuses it; serverless invocations share the cached connection. */
function connectDB() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);
  if (!connecting) {
    const uri = process.env.MONGODB_URI;
    if (!uri) return Promise.reject(new Error('MONGODB_URI is not set'));
    mongoose.set('strictQuery', true);
    connecting = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10000 })
      .then((m) => {
        console.log('MongoDB connected');
        return m.connection;
      })
      .catch((err) => {
        connecting = null; // let the next request retry
        throw err;
      });
  }
  return connecting;
}

module.exports = { connectDB };
