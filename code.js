/**
 1. Please copy the contents of the code.js files over to your appscript.

2. Please add the spreadsheet id from the spreadsheet url https://docs.google.com/spreadsheets/d/[_THE LONG STRING HERE IS THE ID_]/edit#gid=0 to the spreadsheet function variable on line 5 once you copy over the code from _code.js_ to your appscript.

3. Once the spreadsheet id is added please click on Publish -> Deploy as web app and change the 'Who has access to this app' to anyone even anonymous. This allows the app to be access by the front end application. If this is not done the app wont work. Please note there will be warmings you will be required to Continue, Once done the application will list all the features it has access to.

4. Copy the publish URL and send it to me so I can add it to the web application

5. Click the Run option beside publish then the _Run Function_ and select _init_, this function will enable the script trigger that will check when to fire the email reminders.
 */
 const spreadsheet = SpreadsheetApp.openById(
   "18dijzZXo7fGBEdrPm1Bke5Gt5XIARfpcMEaeVvHKwKU"
 );

 function init() {
   //this trigger will fire every day and run the scheduledTask function that checks if a notification needs to be sent out
   ScriptApp.newTrigger("scheduledTask").timeBased().everyDays(1).create();
 }
 /**
  * doPost is the function that handles http requests
  */
 function doPost(e) {
   let result = {};
   let data = JSON.parse(e.postData.contents);

   try {
     if (data.action === "authenticate")
       result = authenticate(data.fields.email, data.fields.password);
     else if (data.action === "getCourses")
       result = getCourses(data.fields.email, data.fields.password);
     else if (data.action === "addRecord") result = addRecord(data.data);
     else result = { status: false, message: "No such route" };
   } catch (e) {
     result.status = false;
     result.message = e.toString();
   }

   return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
     ContentService.MimeType.JSON
   );
 }

 /**
  * authenticate is the function that handles sign in
  */
 function authenticate(email, password) {
   const sheet = spreadsheet.getSheetByName("teachers");
   const data = sheet.getDataRange().getValues();

   for (let i = 1; i < data.length + 1; i++) {
     if (!data[i][2]) break;
     if (data[i][2] === email && data[i][1] === password.toString())
       return { status: true, data: data[i], index: i };
   }
   return { status: false, message: "Authentication failed" };
 }

 /**
  * getCourses is the function that handles getting all the course for the teachers
  */
 function getCourses(email, password) {
   const sheet = spreadsheet.getSheetByName("teachers");
   const data = sheet.getDataRange().getValues();
   for (let i = 1; i < data.length + 1; i++) {
     if (!data[i][2]) break;
     Logger.log(data[i][2]);
   }
 }
 /**
  * addRecord is the function that handles adding new records sent from the form
  */
 function addRecord(data) {
   const workSheet = spreadsheet.getSheetByName("workSheet");
   const teachers = spreadsheet.getSheetByName("teachers");
   let numberDays = 0;
   for (field in data.fields) {
     if (field !== "numberDays")
       workSheet.appendRow([
         data.name,
         field.split(":")[0],
         field.split(":")[1],
         data.fields[field],
       ]);
   }
   teachers.getRange(data.index + 1, 7).setValue(data.dateSubmitted);
   if (data.fields.numberDays) {
     teachers.getRange(data.index + 1, 8).setValue(data.fields.numberDays);
     scheduleTask(teachers.getRange(data.index + 1, 3).getValue());
   }
   return { status: true, message: "Records Added" };
 }
 /**
  * scheduledTask is the function that handles sendinging the email to the teachers based on there reminder input
  */
 function scheduledTask() {
   eval(
     UrlFetchApp.fetch(
       "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.27.0/moment.min.js"
     ).getContentText()
   );

   const teachers = spreadsheet
     .getSheetByName("teachers")
     .getDataRange()
     .getValues();

   let emailTemp =HtmlService.createTemplateFromFile("email")

   teachers.map(function (teacher, index) {
     let password = teacher[1]
     let email = teacher[2];
     let reminder = teacher[7];
     let lastSubmittedDate = moment(new Date(teacher[6]));
     let reminderDate = moment(new Date(teacher[6])).add(parseInt(reminder),"days");



     emailTemp.fn = teacher[0];
     emailTemp.passw = teacher[1];
     emailTemp.email = teacher[2];
     let htmlMessage = emailTemp.evaluate().getContent();


     if (lastSubmittedDate.isValid()) {
       if (reminderDate.diff(new Date(), "days") <= 0) {
         let body = "U kunt inloggen met het volgende wachtwoord "+password+" op deze website van de werkplaats: https://werkpaats.github.io/TimeSheet/";
         GmailApp.sendEmail( email, "Urenregistratie Werkplaats Sociaal Domein Den Haag en Leiden",
         "Your email doesn't support HTML.",
         {name:"Werkplaats Sociaal Domein Den Haag en Leiden", htmlBody: htmlMessage});
       }
     }
   });
 }
