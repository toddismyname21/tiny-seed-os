/**
 * EMPLOYEE ONBOARDING MODULE
 * Comprehensive employee onboarding system
 * Syncs data between USERS and EMPLOYEES sheets
 *
 * Created: 2026-01-29
 * Author: Claude PM System
 */

// Sheet names
const USERS_SHEET = 'USERS';
const EMPLOYEES_SHEET = 'EMPLOYEES';

/**
 * Complete Employee Onboarding
 * Called when employee completes the full onboarding form
 * Creates/updates records in both USERS and EMPLOYEES sheets
 *
 * @param {Object} data - All onboarding form data
 * @returns {Object} { success, employeeId, message }
 */
function completeEmployeeOnboarding(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Verify token first
    const usersSheet = ss.getSheetByName(USERS_SHEET);
    if (!usersSheet) {
      return { success: false, error: 'USERS sheet not found' };
    }

    const usersData = usersSheet.getDataRange().getValues();
    const usersHeaders = usersData[0];
    const tokenCol = usersHeaders.indexOf('Magic_Token');
    const userIdCol = usersHeaders.indexOf('User_ID');

    // Find user by token
    let userRow = -1;
    let userId = null;
    for (let i = 1; i < usersData.length; i++) {
      if (usersData[i][tokenCol] === data.token) {
        userRow = i + 1; // 1-indexed
        userId = usersData[i][userIdCol];
        break;
      }
    }

    if (userRow === -1) {
      return { success: false, error: 'Invalid or expired token' };
    }

    // ============================================
    // UPDATE USERS SHEET
    // ============================================
    const fullName = `${data.firstName} ${data.lastName}`.trim();

    // Helper to update USERS column
    function setUserCol(colName, value) {
      const colIndex = usersHeaders.indexOf(colName);
      if (colIndex !== -1) {
        usersSheet.getRange(userRow, colIndex + 1).setValue(value);
      }
    }

    // Ensure all columns exist in USERS
    const usersCols = [
      'Full_Name', 'Phone', 'Status', 'Emergency_Contact_Name',
      'Emergency_Contact_Phone', 'Emergency_Contact_Relation',
      'Registration_Completed', 'Address', 'City', 'State', 'Zip_Code',
      'Date_Of_Birth', 'Preferred_Name', 'Language', 'Shirt_Size'
    ];

    usersCols.forEach(col => {
      if (usersHeaders.indexOf(col) === -1) {
        const newColIndex = usersHeaders.length + 1;
        usersSheet.getRange(1, newColIndex).setValue(col);
        usersHeaders.push(col);
      }
    });

    // Update USERS sheet
    setUserCol('Full_Name', fullName);
    setUserCol('Phone', data.phone || '');
    setUserCol('Status', 'Pending Approval');
    setUserCol('Emergency_Contact_Name', data.emergencyName || '');
    setUserCol('Emergency_Contact_Phone', data.emergencyPhone || '');
    setUserCol('Emergency_Contact_Relation', data.emergencyRelation || '');
    setUserCol('Registration_Completed', new Date().toISOString());
    setUserCol('Address', `${data.address || ''} ${data.address2 || ''}`.trim());
    setUserCol('City', data.city || '');
    setUserCol('State', data.state || '');
    setUserCol('Zip_Code', data.zipCode || '');
    setUserCol('Date_Of_Birth', data.dateOfBirth || '');
    setUserCol('Preferred_Name', data.preferredName || '');
    setUserCol('Language', data.language || 'English');
    setUserCol('Shirt_Size', data.shirtSize || '');

    // ============================================
    // CREATE/UPDATE EMPLOYEES SHEET
    // ============================================
    let empSheet = ss.getSheetByName(EMPLOYEES_SHEET);

    if (!empSheet) {
      // Create EMPLOYEES sheet with comprehensive columns
      empSheet = ss.insertSheet(EMPLOYEES_SHEET);
      const empHeaders = [
        'Employee_ID', 'User_ID', 'First_Name', 'Last_Name', 'Preferred_Name',
        'Email', 'Phone', 'Date_Of_Birth', 'Language_Pref',
        'Address', 'Address_2', 'City', 'State', 'Zip_Code',
        'Emergency_1_Name', 'Emergency_1_Phone', 'Emergency_1_Relation', 'Emergency_1_Email',
        'Emergency_2_Name', 'Emergency_2_Phone',
        'Shirt_Size', 'Cert_Tractor', 'Cert_Forklift', 'Cert_Drivers', 'Cert_CDL',
        'Cert_FirstAid', 'Cert_FoodSafety', 'Farm_Experience', 'Skills',
        'Start_Date', 'Availability_Notes', 'Transportation',
        'Badge_PIN', 'Role', 'Hire_Date', 'Status', 'Is_Active',
        'Hourly_Rate', 'Last_Clock_In', 'Total_Hours_YTD',
        'Created_At', 'Updated_At', 'Notes'
      ];
      empSheet.getRange(1, 1, 1, empHeaders.length).setValues([empHeaders]);
      empSheet.setFrozenRows(1);

      // Format header row
      empSheet.getRange(1, 1, 1, empHeaders.length)
        .setBackground('#15803d')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
    }

    const empData = empSheet.getDataRange().getValues();
    const empHeaders = empData[0];

    // Check if employee already exists by User_ID
    const empUserIdCol = empHeaders.indexOf('User_ID');
    let empRow = -1;

    for (let i = 1; i < empData.length; i++) {
      if (empData[i][empUserIdCol] === userId) {
        empRow = i + 1;
        break;
      }
    }

    // Generate Employee ID if new
    let employeeId;
    if (empRow === -1) {
      const lastRow = empSheet.getLastRow();
      const empCount = lastRow > 1 ? lastRow - 1 : 0;
      employeeId = 'EMP-' + String(empCount + 1).padStart(3, '0');
      empRow = lastRow + 1;
    } else {
      const empIdCol = empHeaders.indexOf('Employee_ID');
      employeeId = empData[empRow - 1][empIdCol];
    }

    // Helper to set EMPLOYEES column
    function setEmpCol(colName, value) {
      let colIndex = empHeaders.indexOf(colName);
      if (colIndex === -1) {
        // Add column if missing
        const newColIndex = empHeaders.length + 1;
        empSheet.getRange(1, newColIndex).setValue(colName);
        empHeaders.push(colName);
        colIndex = empHeaders.length - 1;
      }
      empSheet.getRange(empRow, colIndex + 1).setValue(value);
    }

    // Get email from USERS
    const emailCol = usersHeaders.indexOf('Email');
    const email = usersData[userRow - 1][emailCol];

    // Set all employee data
    setEmpCol('Employee_ID', employeeId);
    setEmpCol('User_ID', userId);
    setEmpCol('First_Name', data.firstName || '');
    setEmpCol('Last_Name', data.lastName || '');
    setEmpCol('Preferred_Name', data.preferredName || '');
    setEmpCol('Email', email || '');
    setEmpCol('Phone', data.phone || '');
    setEmpCol('Date_Of_Birth', data.dateOfBirth || '');
    setEmpCol('Language_Pref', data.language || 'English');
    setEmpCol('Address', data.address || '');
    setEmpCol('Address_2', data.address2 || '');
    setEmpCol('City', data.city || '');
    setEmpCol('State', data.state || '');
    setEmpCol('Zip_Code', data.zipCode || '');
    setEmpCol('Emergency_1_Name', data.emergencyName || '');
    setEmpCol('Emergency_1_Phone', data.emergencyPhone || '');
    setEmpCol('Emergency_1_Relation', data.emergencyRelation || '');
    setEmpCol('Emergency_1_Email', data.emergencyEmail || '');
    setEmpCol('Emergency_2_Name', data.emergency2Name || '');
    setEmpCol('Emergency_2_Phone', data.emergency2Phone || '');
    setEmpCol('Shirt_Size', data.shirtSize || '');
    setEmpCol('Cert_Tractor', data.certTractor ? 'Yes' : 'No');
    setEmpCol('Cert_Forklift', data.certForklift ? 'Yes' : 'No');
    setEmpCol('Cert_Drivers', data.certDrivers ? 'Yes' : 'No');
    setEmpCol('Cert_CDL', data.certCDL ? 'Yes' : 'No');
    setEmpCol('Cert_FirstAid', data.certFirstAid ? 'Yes' : 'No');
    setEmpCol('Cert_FoodSafety', data.certFoodSafety ? 'Yes' : 'No');
    setEmpCol('Farm_Experience', data.farmExperience || 'None');
    setEmpCol('Skills', data.skills || '');
    setEmpCol('Start_Date', data.startDate || '');
    setEmpCol('Availability_Notes', data.availability || '');
    setEmpCol('Transportation', data.transportation || '');
    setEmpCol('Badge_PIN', '0000'); // Default, changed on approval
    setEmpCol('Role', ''); // Set on approval
    setEmpCol('Status', 'Pending Approval');
    setEmpCol('Is_Active', false);
    setEmpCol('Created_At', new Date().toISOString());
    setEmpCol('Updated_At', new Date().toISOString());

    // ============================================
    // SEND NOTIFICATION TO ADMIN
    // ============================================
    try {
      const adminEmail = 'todd@tinyseedfarmpgh.com';
      const subject = `[Tiny Seed] New Employee Onboarding: ${fullName}`;
      const body = `
A new employee has completed onboarding and needs your approval.

Name: ${fullName}
Email: ${email}
Phone: ${data.phone || 'Not provided'}

Emergency Contact: ${data.emergencyName || 'Not provided'} (${data.emergencyPhone || ''})

Farm Experience: ${data.farmExperience || 'None'}
Certifications: ${[
        data.certTractor ? 'Tractor' : '',
        data.certForklift ? 'Forklift' : '',
        data.certDrivers ? "Driver's License" : '',
        data.certCDL ? 'CDL' : '',
        data.certFirstAid ? 'First Aid/CPR' : '',
        data.certFoodSafety ? 'Food Safety' : ''
      ].filter(c => c).join(', ') || 'None'}

Earliest Start Date: ${data.startDate || 'Not specified'}
Transportation: ${data.transportation || 'Not specified'}

---
Review and approve at:
https://toddismyname21.github.io/tiny-seed-os/web_app/employee-approve.html

Or go to: Tiny Seed OS > Employee Approvals
      `;

      MailApp.sendEmail(adminEmail, subject, body);
    } catch (emailError) {
      Logger.log('Failed to send admin notification: ' + emailError.toString());
    }

    return {
      success: true,
      employeeId: employeeId,
      userId: userId,
      message: `Onboarding complete for ${fullName}. Pending manager approval.`
    };

  } catch (error) {
    Logger.log('completeEmployeeOnboarding error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Get all employees with full details for admin dashboard
 *
 * @returns {Object} { success, employees: [...] }
 */
function getAllEmployees() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const empSheet = ss.getSheetByName(EMPLOYEES_SHEET);

    if (!empSheet || empSheet.getLastRow() <= 1) {
      return { success: true, employees: [] };
    }

    const data = empSheet.getDataRange().getValues();
    const headers = data[0];

    const employees = [];
    for (let i = 1; i < data.length; i++) {
      if (!data[i][0]) continue; // Skip empty rows

      const emp = {};
      headers.forEach((header, j) => {
        emp[header] = data[i][j];
      });
      employees.push(emp);
    }

    return { success: true, employees: employees };

  } catch (error) {
    Logger.log('getAllEmployees error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Approve employee - activates account and sets role
 * Updates both USERS and EMPLOYEES sheets
 *
 * @param {Object} data - { userId, role, hourlyRate, badgePin, notes }
 * @returns {Object} { success, message }
 */
function approveEmployeeComplete(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // ============================================
    // UPDATE USERS SHEET
    // ============================================
    const usersSheet = ss.getSheetByName(USERS_SHEET);
    const usersData = usersSheet.getDataRange().getValues();
    const usersHeaders = usersData[0];

    const userIdCol = usersHeaders.indexOf('User_ID');
    let userRow = -1;
    let employeeName = '';
    let email = '';

    for (let i = 1; i < usersData.length; i++) {
      if (usersData[i][userIdCol] === data.userId) {
        userRow = i + 1;
        employeeName = usersData[i][usersHeaders.indexOf('Full_Name')] || 'Employee';
        email = usersData[i][usersHeaders.indexOf('Email')] || '';
        break;
      }
    }

    if (userRow === -1) {
      return { success: false, error: 'User not found' };
    }

    // Update USERS
    function setUserCol(colName, value) {
      const colIndex = usersHeaders.indexOf(colName);
      if (colIndex !== -1) {
        usersSheet.getRange(userRow, colIndex + 1).setValue(value);
      }
    }

    setUserCol('Status', 'Active');
    setUserCol('Is_Active', true);
    setUserCol('Role', data.role || 'Field Worker');
    if (data.badgePin) {
      setUserCol('PIN', data.badgePin);
    }

    // ============================================
    // UPDATE EMPLOYEES SHEET
    // ============================================
    const empSheet = ss.getSheetByName(EMPLOYEES_SHEET);
    if (empSheet) {
      const empData = empSheet.getDataRange().getValues();
      const empHeaders = empData[0];
      const empUserIdCol = empHeaders.indexOf('User_ID');

      let empRow = -1;
      for (let i = 1; i < empData.length; i++) {
        if (empData[i][empUserIdCol] === data.userId) {
          empRow = i + 1;
          break;
        }
      }

      if (empRow !== -1) {
        function setEmpCol(colName, value) {
          const colIndex = empHeaders.indexOf(colName);
          if (colIndex !== -1) {
            empSheet.getRange(empRow, colIndex + 1).setValue(value);
          }
        }

        setEmpCol('Status', 'Active');
        setEmpCol('Is_Active', true);
        setEmpCol('Role', data.role || 'Field Worker');
        setEmpCol('Hire_Date', new Date().toISOString().split('T')[0]);
        setEmpCol('Updated_At', new Date().toISOString());
        if (data.badgePin) {
          setEmpCol('Badge_PIN', data.badgePin);
        }
        if (data.hourlyRate) {
          setEmpCol('Hourly_Rate', data.hourlyRate);
        }
        if (data.notes) {
          setEmpCol('Notes', data.notes);
        }
      }
    }

    // ============================================
    // SEND WELCOME EMAIL TO EMPLOYEE
    // ============================================
    if (email) {
      try {
        const subject = 'Welcome to Tiny Seed Farm!';
        const body = `
Hi ${employeeName.split(' ')[0]}!

Great news - your account has been approved! You're now officially part of the Tiny Seed Farm team.

Your Details:
- Role: ${data.role || 'Field Worker'}
- Badge PIN: ${data.badgePin || '0000'}

You can now access the Employee App to:
- Clock in and out
- View your schedule
- See assigned tasks

Employee App: https://toddismyname21.github.io/tiny-seed-os/employee.html

Questions? Reply to this email or text Todd.

Welcome aboard!
Tiny Seed Farm
        `;

        MailApp.sendEmail(email, subject, body);
      } catch (emailError) {
        Logger.log('Failed to send welcome email: ' + emailError.toString());
      }
    }

    return {
      success: true,
      employeeName: employeeName,
      message: `${employeeName} has been approved as ${data.role || 'Field Worker'}`
    };

  } catch (error) {
    Logger.log('approveEmployeeComplete error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Get employee by ID with full details
 *
 * @param {string} employeeId - Employee ID or User ID
 * @returns {Object} { success, employee: {...} }
 */
function getEmployeeDetails(employeeId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const empSheet = ss.getSheetByName(EMPLOYEES_SHEET);

    if (!empSheet) {
      return { success: false, error: 'EMPLOYEES sheet not found' };
    }

    const data = empSheet.getDataRange().getValues();
    const headers = data[0];

    const empIdCol = headers.indexOf('Employee_ID');
    const userIdCol = headers.indexOf('User_ID');

    for (let i = 1; i < data.length; i++) {
      if (data[i][empIdCol] === employeeId || data[i][userIdCol] === employeeId) {
        const emp = {};
        headers.forEach((header, j) => {
          emp[header] = data[i][j];
        });
        return { success: true, employee: emp };
      }
    }

    return { success: false, error: 'Employee not found' };

  } catch (error) {
    Logger.log('getEmployeeDetails error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Update employee information
 *
 * @param {Object} data - { employeeId, ...fieldsToUpdate }
 * @returns {Object} { success, message }
 */
function updateEmployee(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const empSheet = ss.getSheetByName(EMPLOYEES_SHEET);

    if (!empSheet) {
      return { success: false, error: 'EMPLOYEES sheet not found' };
    }

    const sheetData = empSheet.getDataRange().getValues();
    const headers = sheetData[0];
    const empIdCol = headers.indexOf('Employee_ID');

    let empRow = -1;
    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][empIdCol] === data.employeeId) {
        empRow = i + 1;
        break;
      }
    }

    if (empRow === -1) {
      return { success: false, error: 'Employee not found' };
    }

    // Update fields
    Object.keys(data).forEach(key => {
      if (key !== 'employeeId') {
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          empSheet.getRange(empRow, colIndex + 1).setValue(data[key]);
        }
      }
    });

    // Always update Updated_At
    const updatedCol = headers.indexOf('Updated_At');
    if (updatedCol !== -1) {
      empSheet.getRange(empRow, updatedCol + 1).setValue(new Date().toISOString());
    }

    return { success: true, message: 'Employee updated successfully' };

  } catch (error) {
    Logger.log('updateEmployee error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Deactivate employee (soft delete)
 *
 * @param {string} employeeId - Employee ID
 * @param {string} reason - Reason for deactivation
 * @returns {Object} { success, message }
 */
function deactivateEmployee(employeeId, reason) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Update EMPLOYEES
    const empSheet = ss.getSheetByName(EMPLOYEES_SHEET);
    if (empSheet) {
      const empData = empSheet.getDataRange().getValues();
      const empHeaders = empData[0];
      const empIdCol = empHeaders.indexOf('Employee_ID');

      for (let i = 1; i < empData.length; i++) {
        if (empData[i][empIdCol] === employeeId) {
          const statusCol = empHeaders.indexOf('Status');
          const activeCol = empHeaders.indexOf('Is_Active');
          const notesCol = empHeaders.indexOf('Notes');
          const updatedCol = empHeaders.indexOf('Updated_At');

          if (statusCol !== -1) empSheet.getRange(i + 1, statusCol + 1).setValue('Inactive');
          if (activeCol !== -1) empSheet.getRange(i + 1, activeCol + 1).setValue(false);
          if (notesCol !== -1) {
            const existingNotes = empData[i][notesCol] || '';
            const newNote = `[${new Date().toISOString().split('T')[0]}] Deactivated: ${reason || 'No reason given'}`;
            empSheet.getRange(i + 1, notesCol + 1).setValue(existingNotes + '\n' + newNote);
          }
          if (updatedCol !== -1) empSheet.getRange(i + 1, updatedCol + 1).setValue(new Date().toISOString());

          // Get User_ID to update USERS sheet
          const userIdCol = empHeaders.indexOf('User_ID');
          const userId = empData[i][userIdCol];

          if (userId) {
            const usersSheet = ss.getSheetByName(USERS_SHEET);
            const usersData = usersSheet.getDataRange().getValues();
            const usersHeaders = usersData[0];
            const usersUserIdCol = usersHeaders.indexOf('User_ID');

            for (let j = 1; j < usersData.length; j++) {
              if (usersData[j][usersUserIdCol] === userId) {
                const usersStatusCol = usersHeaders.indexOf('Status');
                const usersActiveCol = usersHeaders.indexOf('Is_Active');

                if (usersStatusCol !== -1) usersSheet.getRange(j + 1, usersStatusCol + 1).setValue('Inactive');
                if (usersActiveCol !== -1) usersSheet.getRange(j + 1, usersActiveCol + 1).setValue(false);
                break;
              }
            }
          }

          return { success: true, message: 'Employee deactivated successfully' };
        }
      }
    }

    return { success: false, error: 'Employee not found' };

  } catch (error) {
    Logger.log('deactivateEmployee error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}
