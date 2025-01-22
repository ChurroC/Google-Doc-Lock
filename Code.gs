function onOpen(e) {
  DocumentApp.getUi().createAddonMenu()
    .addItem('Hide Content', 'hideContent')
    .addItem('Show Content', 'showContent')
    .addToUi();
}

function hideContent() {
  const ui = DocumentApp.getUi();
  const response = ui.prompt('Enter a password to hide the content:', ui.ButtonSet.OK_CANCEL);
  
  if (response.getSelectedButton() == ui.Button.OK) {
    const password = response.getResponseText();
    const doc = DocumentApp.getActiveDocument();
    
    try {
      // Create a temporary document with the content
      const tempDoc = DriveApp.getFileById(doc.getId()).makeCopy('TEMP_' + new Date().getTime());
      const tempDocId = tempDoc.getId();
      
      // Store the temp doc ID and password
      PropertiesService.getDocumentProperties().setProperties({
        'tempDocId': tempDocId,
        'password': password
      });
      
      // Clear original document
      const body = doc.getBody();
      body.clear();
      body.setText('🔒 This document is locked. Use the Security menu to unlock.');
      
    } catch (error) {
      ui.alert('Error: Make sure the script has permission to access Drive\n\n' + error.toString());
    }
  }
}

function showContent() {
  const ui = DocumentApp.getUi();
  const response = ui.prompt('Enter password to unlock:', ui.ButtonSet.OK_CANCEL);
  
  if (response.getSelectedButton() == ui.Button.OK) {
    const props = PropertiesService.getDocumentProperties();
    const storedPassword = props.getProperty('password');
    
    if (response.getResponseText() === storedPassword) {
      try {
        // Get the temp document
        const tempDocId = props.getProperty('tempDocId');
        const tempDoc = DocumentApp.openById(tempDocId);
        
        // Copy content back to original
        const doc = DocumentApp.getActiveDocument();
        const body = doc.getBody();
        body.clear();
        
        // Copy all elements from temp doc
        const tempBody = tempDoc.getBody();
        const numChildren = tempBody.getNumChildren();
        
        // Copy each element individually
        for (let i = 0; i < numChildren; i++) {
          let element = tempBody.getChild(i).copy();
          let type = element.getType();
          
          if (type === DocumentApp.ElementType.PARAGRAPH) {
            body.appendParagraph(element);
          } else if (type === DocumentApp.ElementType.TABLE) {
            body.appendTable(element);
          } else if (type === DocumentApp.ElementType.LIST_ITEM) {
            body.appendListItem(element);
          } else if (type === DocumentApp.ElementType.HORIZONTAL_RULE) {
            body.appendHorizontalRule();
          } else {
            // For any other type, try to append as a generic element
            try {
              body.appendParagraph(element);
            } catch(e) {
              Logger.log('Could not append element of type: ' + type);
            }
          }
        }
        
        // Clean up
        DriveApp.getFileById(tempDocId).setTrashed(true);
        props.deleteAllProperties();
        
        ui.alert('Document unlocked successfully!');
      } catch (error) {
        ui.alert('Error restoring content: ' + error.toString());
      }
    } else {
      ui.alert('Incorrect password');
    }
  }
}
