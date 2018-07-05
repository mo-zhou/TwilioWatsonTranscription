
// This script uses Watson Addon to transcribe conference call, voice call from Twilio and download the transcription.txt file 

const express = require('express');
const bodyParser = require('body-parser')
const axios = require('axios')
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const Path = require('path') 
const fs = require('fs')
const http = require('http')

const app = express();
app.use(bodyParser.urlencoded({extended: false}))

app.post('/voice', (req, res) => {
  const twiml = new VoiceResponse()

  twiml.say('Hi! I want to know what do you think about coding.')
  twiml.record({timeout: 3600, maxLength: 7200, action: '/recording'}) //max. recording time for voice 2 hrs, time out (when silent) is one hr
  twiml.hangup()

  res.send(twiml.toString())
});

app.post('/conf', (req, res) => {
  const twiml = new VoiceResponse()
  const dial = twiml.dial();

  dial.conference(
  {
    record: 'record-from-start',
    recordingStatusCallback: '/recording',
  },
  'LoveTwilio'
  );
  console.log("Your conference has ended and recording finished.");
  res.send(twiml.toString())
});

app.post('/recording', (req, res) => {
  const twiml = new VoiceResponse()
  const recordingUrl = req.body.RecordingUrl
  console.log("Your voice call has ended and recording finished.")
  twiml.say('Your voice recording has finished')
  res.send(twiml.toString())
})

app.post('/callback', (req, res) => {
  const addOns = JSON.parse(req.body.AddOns)

  if (!('ibm_watson_speechtotext' in addOns.results)) {
    return 'Add Watson Speech to Text add-on in your Twilio console'
  }

  const payloadUrl = addOns.results.ibm_watson_speechtotext.payload[0].url
  const accountSID = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  //axios.get

  axios.get(payloadUrl, {auth: {username: accountSID, password: authToken}})
    .then(response => {
      const results = response.data.results[0].results
      const transcripts = results.map(item => item.alternatives[0].transcript)
      console.log('Transcripts: ' + transcripts)
      //write to a file
      fs.writeFile("Transcription.txt", transcripts, function(err) {
      if(err) {
        return console.log(err);
      }
      console.log("Transcription file has been saved!");

    }); 
      return transcripts
      
    })
     .then(transcripts => res.send(transcripts.join(' ')))
     console.log('transcripts are ready')

   });

app.listen(8001);
console.log('the app server is running on 8001');