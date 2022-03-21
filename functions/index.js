const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {firestore} = require("firebase-admin");
admin.initializeApp();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

exports.removeExpiredReservation =
  functions.pubsub.schedule("every 1 minutes").onRun((context) => {
    console.log("removeExpiredReservation run");
    const db = admin.firestore();
    const now = firestore.Timestamp.now();
    // const ts = firestore.Timestamp.fromMillis(now.toMillis() - 3600000);
    const ts = firestore.Timestamp.fromMillis(now.toMillis() - 300000);

    const promises = [];
    const readingRoom = db.collection("ReadingRoom");
    const readingRoomSnap = readingRoom.get();

    readingRoomSnap.then((roomDoc) => {
      roomDoc.forEach((room) => {
        room.ref.collection("Seat")
            // .where("reservPublishedAt", "<", ts)
            .get()
            .then((seatDoc) => {
              console.log("TS: " + ts);
              console.log("SeatDocSize: " + seatDoc.size);
              seatDoc.forEach((seat) => {
                // console.log("Seat Status: " + seat.data());
                seat.ref.update({status: "Empty", reservPublishedAt: 0});
                const snap = seat.ref.collection("Reservation").get();
                snap.then((snap) => {
                  snap.forEach((dest) => {
                    promises.push(dest.ref.delete());
                  });
                });
              });
            });
      });
    });
    return Promise.all(promises);
  });
