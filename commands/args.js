module.exports = function (client, target, args) {
    client.say(target, `Your args are '${args.join(' ')}'`)
}