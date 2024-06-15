
module.exports = async function (event, client, target, io) {
  console.log('Emitting sound')
  io.emit('playsound', { sound: 'bøh.mp3' })
}