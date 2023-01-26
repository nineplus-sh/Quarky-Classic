/**
 * Open gateway connection
 * Call socketListeners() to add listeners
 */
function openGateway() {
    wss = new WebSocket("wss://lq-gateway.litdevs.org", authToken);
    socketListeners();
}

/**
 * Adds listeners to gateway socket
 */
function socketListeners() {
    wss.onopen = (message) => {
        retryCount = 0; // Connection open, reset retry counter
        // If the welcome flow has been completed before, just hide the loader
        if (welcomeHasFinishedOnce) {
            document.querySelector("#loader").classList.add("bye");
        }
        // Send heartbeat to server every 15 seconds
        heartbeat = setInterval(() => {
            console.log(settingGet("uwuspeak") ? owo(saLines[saIndex]) : saLines[saIndex]) // i need to know if it's doin the funnies
           wss.send(JSON.stringify({event: "heartbeat", message: settingGet("uwuspeak") ? owo(saLines[saIndex]) : saLines[saIndex]}))
           saIndex += 1;
           if(saIndex === saLines.length - 1) saIndex = 0;
        }, 15000);
    }
    wss.onmessage =(message) => {
        data = JSON.parse(message.data);
        if(data.eventId == "messageCreate") {
            console.log(data);
            if(data.message.channelId == currentChannel) { // render the message if it's in the current channel
                messageRender(cleanMessage(data))
            }
            if(document.hidden || data.message.channelId != currentChannel) { // channel isn't focused
                if(settingGet("notify")) { // user has notifications on
                    sendNotification(`${data.author.username} (#${channelBox[data.message.channelId].name}, ${channelBox[data.message.channelId].quark})`, data.message.content, true, data.author.avatarUri)
                    console.log(data.author, channelBox)
                }
            }
        }
    }
    wss.onclose = (message) => {
        if (heartbeat) clearInterval(heartbeat);
        document.querySelector("#loader").classList.remove("bye");
        changeLoading("Connection lost<br/>Please wait - attempting to reestablish...");
        if (retryCount < 5) { // Max 5 retries
            // Try reconnect after 1*retryCount seconds
            retryCount++;
            setTimeout(() => {
                openGateway();
            }, 1000 * retryCount);
        } else {
            alert("Can't open gateway connection, either your internet connection is broken, server is down or your login is wrong");
        }
    }

    wss.onerror = (message) => {
        // stuff 3
    }
}

let saLines = `This was a triumph
I'm making a note here; "Huge success"
It's hard to overstate
My satisfaction
Aperture Science:
We do what we must
Because we can
For the good of all of us
Except the ones who are dead
But there's no sense crying
Over every mistake
You just keep on trying
Till you run out of cake
And the science gets done
And you make a neat gun
For the people who are
Still alive
I'm not even angry
I'm being so sincere right now
Even though you broke my heart,
And killed me
And tore me to pieces
And threw every piece into a fire
As they burned it hurt because
I was so happy for you
Now, these points of data
Make a beautiful line
And we're out of beta
We're releasing on time
So I'm GLaD I got burned
Think of all the things we learned-
For the people who are
Still alive
Go ahead and leave me
I think I'd prefer to stay inside
Maybe you'll find someone else
To help you?
Maybe Black Mesa?
That was a joke *Haha - Fat Chance*
Anyway this cake is great
It's so delicious and moist
Look at me: still talking
When there's science to do
When I look out there,
It makes me GLaD I'm not you
I've experiments to run
There is research to be done
On the people who are
Still alive
And believe me I am
Still alive
I'm doing science and I'm
Still alive
I feel fantastic and I'm
Still alive
While you're dying I'll be
Still alive
And when you're dead I will be
Still alive
Still alive`.split("\n");
let saIndex = 0;