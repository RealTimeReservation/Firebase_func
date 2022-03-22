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
    const ts = firestore.Timestamp.fromMillis(now.toMillis() - 60000);

    const promises = [];
    const readingRoom = db.collection("ReadingRoom");
    const readingRoomSnap = readingRoom.get();

    // 만료된 Reserved 삭제(reservPublishedAt기준), 만료된 Seating 삭제()
    readingRoomSnap.then((roomDoc) => {
      roomDoc.forEach((room) => {
        room.ref.collection("Seat")
            .where("status", "!=", "Empty")
            .get()
            .then((seatDoc) => {
              console.log("TS: " + ts.toMillis());
              console.log("SeatDocSize: " + seatDoc.size);
              seatDoc.forEach((seat) => {
                if (seat.get("status") == "Reserved") {
                  if (seat.get("reservPublishedAt") < ts.toMillis()) {
                    seat.ref.update({status: "Empty", reservPublishedAt: 0});
                    const snap = seat.ref.collection("Reservation").get();
                    snap.then((snap) => {
                      snap.forEach((dest) => {
                        const user = db.collection("UserData")
                            .doc(dest.get("reservated_user_id"))
                            .collection("Reservation");
                        const userSnap = user.get();

                        userSnap.then((s1) => {
                          s1.forEach((s2) => {
                            s2.ref.delete();
                          });
                        });

                        promises.push(dest.ref.delete());
                      });
                    });
                  }
                } else if (seat.get("status") == "Seating") {
                  const snap = seat.ref.collection("Reservation").get();
                  snap.then((snap) => {
                    snap.forEach((dest) => {
                      if (dest.get("expiredAt") < now.toMillis()) {
                        seat.ref
                            .update({status: "Empty", reservPublishedAt: 0});
                        const user = db.collection("UserData")
                            .doc(dest.get("reservated_user_id"))
                            .collection("Reservation");
                        const userSnap = user.get();

                        userSnap.then((s1) => {
                          s1.forEach((s2) => {
                            s2.ref.delete();
                          });
                        });

                        promises.push(dest.ref.delete());
                      }
                    });
                  });
                }
              });
            });
      });
    });

    return Promise.all(promises);
  });
