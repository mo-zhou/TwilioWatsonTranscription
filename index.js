// This script uses Watson Addon to transcribe conference call, voice call from Twilio. 
//After the call/conference ends, the transcription will be written to a Google Spreadsheet file
//Initialize by sharing the email in your client_secret.json with the spreadsheet of editing access
//Your /voice URL should be the incoming voice webhook
//the /conf URL will be the conference webhook
// the /callback will be the Watson Callback URL

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const fs = require('fs');
const PORT = process.env.PORT || 5000;
const app = express();
let googleSpreadsheet = require('google-spreadsheet');
let creds = require('./client_secret.json');
let spreadSheetID = process.env.googleSheetID; //use your spreadsheet ID

app.use(bodyParser.urlencoded({extended: false}))

app.post('/voice', (req, res) => {
  const twiml = new VoiceResponse()

  twiml.say('Hi! You will be connected shortly. This call is recorded for personal use.')
  twiml.record({timeout: 3600, maxLength: 7200, action: '/recording'}) //max. recording time for voice 2 hrs, time out (when silent) is one hr
  twiml.hangup()

  res.send(twiml.toString())
});

app.post('/conf', (req, res) => {
  const twiml = new VoiceResponse()
  const dial = twiml.dial()
  twiml.say('Hi! Thank you for joining my conference. This call is recorded for personal use.')
  dial.conference(
  {
    record: 'record-from-start',
    recordingStatusCallback: '/recording',
  },
  'LoveTwilio'
  );
  console.log("Your conference has started and you are being recorded.")
  res.send(twiml.toString())
});

app.post('/recording', (req, res) => {
  const twiml = new VoiceResponse()
  const recordingUrl = req.body.RecordingUrl
  //console.log("Your recording has started.")
  //twiml.say('Your voice recording has finished')
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
  let doc = new googleSpreadsheet(spreadSheetID)
  let date = new Date()

  //axios.get

  axios.get(payloadUrl, {auth: {username: accountSID, password: authToken}})
    .then(response => {
      const results = response.data.results[0].results
      const transcripts = results.map(item => item.alternatives[0].transcript)
      //console.log('Transcripts: ' + transcripts)
      // Create a document object using the ID of the spreadsheet - obtained from its URL.
      // Authenticate with the Google Spreadsheets API.
      doc.useServiceAccountAuth(creds, function (err) {
      //write to a row with the time and transcripts of the conference
      doc.addRow(1, { conference_time: date, transcripts: transcripts }, function(err) {
        console.log('transcripts are written to your google spreadsheet ID: ' + spreadSheetID)
        if(err) {
          console.log(err);
        }
      });
    });
      return transcripts
    })
     .then(transcripts => res.send(transcripts.join(' ')))
     console.log('transcripts are ready')

   });

app.listen(PORT, () => console.log(`listening on port ${ PORT }`));
