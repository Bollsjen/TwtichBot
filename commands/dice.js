module.exports = function (client, target) {
    const sides = 6
    const num = Math.floor(Math.random() * sides) + 1
    console.log('target', target)
    client.say(target, `You rolled a ${num}`)
}