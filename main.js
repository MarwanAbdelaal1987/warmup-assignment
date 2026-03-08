const fs = require("fs");

// 1. Convert "hh:mm:ss am/pm" → total seconds since midnight
function timeToSeconds(timeStr) {
    const [timePart, period] = timeStr.toLowerCase().split(" ");
    let [hours, minutes, seconds] = timePart.split(":").map(Number);

    if (period === "pm" && hours !== 12) {
        hours += 12;
    }
    if (period === "am" && hours === 12) {
        hours = 0;
    }

    return hours * 3600 + minutes * 60 + seconds;
}

// 2. Convert seconds → "h:mm:ss" format (h can be 1–2 digits usually)
function secondsToDuration(seconds) {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// 3. Convert seconds → "hhh:mm:ss" format (hours padded to at least 3 digits only if ≥100)
function secondsToTotalHours(seconds) {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const hourStr = h >= 100 ? h.toString() : h.toString(); // no leading zero for <100
    return `${hourStr}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// 4. Parse "h:mm:ss" or "hh:mm:ss" or "hhh:mm:ss" back to seconds
function durationToSeconds(durationStr) {
    const parts = durationStr.split(":").map(Number);
    if (parts.length !== 3) return 0; // invalid → return 0 or throw later if needed

    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
}

// 5. Get day of week number from date string "yyyy-mm-dd" (0=Sunday, 6=Saturday)
function getDayOfWeek(dateStr) {
    const date = new Date(dateStr);
    return date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

// 6. Check if date is in Eid reduced quota period (April 10–30, 2025)
function isEidPeriod(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();     // 0=Jan, 3=Apr
    const day = date.getDate();

    if (year !== 2025) return false;
    if (month !== 3) return false;     // April
    return day >= 10 && day <= 30;
}

// 7. Get daily quota in seconds (used in metQuota and required hours)
function getDailyQuotaSeconds(dateStr) {
    return isEidPeriod(dateStr) ? 6 * 3600 : (8 * 3600 + 24 * 60); 
}

// Day name → number map (used later in function 9)
const dayNameToNumber = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6
};
// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    let startSec = timeToSeconds(startTime);
    let endSec = timeToSeconds(endTime);

    // Handle if shift crosses midnight (end < start)
    if (endSec < startSec) {
        endSec += 24 * 3600; // Add full day
    }

    const durationSec = endSec - startSec;
    return secondsToDuration(durationSec);
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    let startSec = timeToSeconds(startTime);
    let endSec = timeToSeconds(endTime);

    // Handle if shift crosses midnight
    if (endSec < startSec) {
        endSec += 24 * 3600;
    }

    const deliveryStart = 8 * 3600;  // 8:00 AM
    const deliveryEnd = 22 * 3600;   // 10:00 PM

    let idleSec = 0;

    // Idle before 8 AM
    if (startSec < deliveryStart) {
        idleSec += deliveryStart - startSec;
    }

    // Idle after 10 PM
    if (endSec > deliveryEnd) {
        idleSec += endSec - deliveryEnd;
    }

    // If entire shift is before 8 AM or after 10 PM, idle is full duration
    return secondsToDuration(idleSec);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    const shiftSec = durationToSeconds(shiftDuration);
    const idleSec = durationToSeconds(idleTime);

    let activeSec = shiftSec - idleSec;
    if (activeSec < 0) {
        activeSec = 0; // Prevent negative time
    }

    return secondsToDuration(activeSec);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    const quotaSec = getDailyQuotaSeconds(date);
    const activeSec = durationToSeconds(activeTime);
    return activeSec >= quotaSec;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    const { driverID, driverName, date, startTime, endTime } = shiftObj;

    // Read file content
    let content = fs.readFileSync(textFile, 'utf8').trim();
    let lines = content.split('\n').filter(line => line.trim() !== '');

    // Parse header and data rows
    const header = lines[0].split(',');
    const dataRows = lines.slice(1).map(line => line.split(','));

    // Check for duplicate (same driverID and date)
    const duplicate = dataRows.some(row => row[0] === driverID && row[2] === date);
    if (duplicate) {
        return {};
    }

    // Calculate derived fields using previous functions
    const shiftDuration = getShiftDuration(startTime, endTime);
    const idleTime = getIdleTime(startTime, endTime);
    const activeTime = getActiveTime(shiftDuration, idleTime);
    const metQuotaBool = metQuota(date, activeTime);
    const hasBonus = false;

    // Create new row as array (match file format: strings, booleans as 'true'/'false')
    const newRow = [
        driverID,
        driverName,
        date,
        startTime,
        endTime,
        shiftDuration,
        idleTime,
        activeTime,
        metQuotaBool ? 'true' : 'false',
        hasBonus ? 'true' : 'false'
    ];

    // Find insert position: after last row with same driverID (assume file sorted by driverID)
    let insertIndex = dataRows.length; // default: append
    for (let i = dataRows.length - 1; i >= 0; i--) {
        if (dataRows[i][0] === driverID) {
            insertIndex = i + 1;
            break;
        }
    }

    // Insert into dataRows
    dataRows.splice(insertIndex, 0, newRow);

    // Rebuild file content (header + rows)
    const newContent = [header.join(','), ...dataRows.map(row => row.join(','))].join('\n') + '\n';
    fs.writeFileSync(textFile, newContent, 'utf8');

    // Return object (with boolean values, not strings)
    return {
        driverID,
        driverName,
        date,
        startTime,
        endTime,
        shiftDuration,
        idleTime,
        activeTime,
        metQuota: metQuotaBool,
        hasBonus
    };
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    // Read file content
    let content = fs.readFileSync(textFile, 'utf8').trim();
    let lines = content.split('\n').filter(line => line.trim() !== '');

    // If no content or only header, do nothing
    if (lines.length <= 1) return;

    // Find and update the matching line
    let updated = false;
    for (let i = 1; i < lines.length; i++) { // Skip header
        let row = lines[i].split(',');
        if (row[0] === driverID && row[2] === date) {
            row[9] = newValue ? 'true' : 'false'; // Last column: HasBonus
            lines[i] = row.join(',');
            updated = true;
            break; // Assume only one match
        }
    }

    // If updated, write back
    if (updated) {
        const newContent = lines.join('\n') + '\n';
        fs.writeFileSync(textFile, newContent, 'utf8');
    }
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // Read file content
    let content = fs.readFileSync(textFile, 'utf8').trim();
    let lines = content.split('\n').filter(line => line.trim() !== '');

    // If only header or empty, return -1 (no driver)
    if (lines.length <= 1) return -1;

    // Normalize month to "mm" format (e.g., "4" → "04")
    let monthStr = month.toString().padStart(2, '0');

    // Check if driver exists at all
    const driverExists = lines.slice(1).some(line => line.split(',')[0] === driverID);
    if (!driverExists) return -1;

    // Count bonuses: filter rows for driver, month, hasBonus 'true'
    let bonusCount = 0;
    for (let i = 1; i < lines.length; i++) {
        let row = lines[i].split(',');
        let rowDriverID = row[0];
        let rowDate = row[2]; // yyyy-mm-dd
        let rowMonth = rowDate.split('-')[1]; // mm
        let rowHasBonus = row[9]; // 'true' or 'false'

        if (rowDriverID === driverID && rowMonth === monthStr && rowHasBonus === 'true') {
            bonusCount++;
        }
    }

    return bonusCount;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // Read file content
    let content = fs.readFileSync(textFile, 'utf8').trim();
    let lines = content.split('\n').filter(line => line.trim() !== '');

    // If only header or empty, return "000:00:00" (or "0:00:00" but format as hhh)
    if (lines.length <= 1) return "000:00:00";

    // Normalize month to "mm" (month is number, e.g., 4 → "04")
    let monthStr = month.toString().padStart(2, '0');

    // Sum active seconds for matching rows
    let totalActiveSec = 0;
    for (let i = 1; i < lines.length; i++) {
        let row = lines[i].split(',');
        let rowDriverID = row[0];
        let rowDate = row[2]; // yyyy-mm-dd
        let rowMonth = rowDate.split('-')[1]; // mm
        let rowActiveTime = row[7]; // h:mm:ss

        if (rowDriverID === driverID && rowMonth === monthStr) {
            totalActiveSec += durationToSeconds(rowActiveTime);
        }
    }

    // Format as hhh:mm:ss (use secondsToTotalHours for potential 3-digit hours)
    return secondsToTotalHours(totalActiveSec);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    // Read shifts file
    let shiftsContent = fs.readFileSync(textFile, 'utf8').trim();
    let shiftsLines = shiftsContent.split('\n').filter(line => line.trim() !== '');

    // Read rate file
    let ratesContent = fs.readFileSync(rateFile, 'utf8').trim();
    let ratesLines = ratesContent.split('\n').filter(line => line.trim() !== '');

    // Find driver's dayOff from rateFile (no header, each line is data)
    let dayOff = null;
    for (let line of ratesLines) {
        let row = line.split(',');
        if (row[0] === driverID) {
            dayOff = row[1]; // e.g., 'Friday'
            break;
        }
    }
    if (!dayOff) return "000:00:00"; // No driver → 0 (safe default)

    // Get dayOff number (0=Sun, etc.)
    const dayOffNum = dayNameToNumber[dayOff] || -1; // Invalid → no skip

    // Normalize month to "mm" (month is number)
    let monthStr = month.toString().padStart(2, '0');

    // Sum quota seconds for shifts in month, skipping day off
    let totalRequiredSec = 0;
    for (let i = 1; i < shiftsLines.length; i++) { // Skip header
        let row = shiftsLines[i].split(',');
        let rowDriverID = row[0];
        let rowDate = row[2]; // yyyy-mm-dd
        let rowMonth = rowDate.split('-')[1];

        if (rowDriverID === driverID && rowMonth === monthStr) {
            const dayNum = getDayOfWeek(rowDate);
            if (dayNum !== dayOffNum) { // Not day off
                totalRequiredSec += getDailyQuotaSeconds(rowDate);
            }
        }
    }

    // Subtract 2 hours per bonus
    totalRequiredSec -= bonusCount * 2 * 3600;
    if (totalRequiredSec < 0) totalRequiredSec = 0;

    // Format as hhh:mm:ss
    return secondsToTotalHours(totalRequiredSec);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // Parse hours to seconds
    const actualSec = durationToSeconds(actualHours);
    const requiredSec = durationToSeconds(requiredHours);

    // If actual >= required, no deduction
    if (actualSec >= requiredSec) {
        // Still need basePay, so read file
    } else {
        // Proceed to calculate deduction
    }

    // Read rate file (no header)
    let ratesContent = fs.readFileSync(rateFile, 'utf8').trim();
    let ratesLines = ratesContent.split('\n').filter(line => line.trim() !== '');

    // Find driver's basePay and tier
    let basePay = 0;
    let tier = 0;
    for (let line of ratesLines) {
        let row = line.split(',');
        if (row[0] === driverID) {
            basePay = parseInt(row[2], 10); // BasePay
            tier = parseInt(row[3], 10);   // Tier
            break;
        }
    }
    if (basePay === 0) return 0; // No driver → 0 (safe)

    // If actual >= required, return basePay
    if (actualSec >= requiredSec) {
        return basePay;
    }

    // Calculate missing seconds
    const missingSec = requiredSec - actualSec;

    // Tier allowances (in hours * 3600 sec)
    const allowances = [0, 50, 20, 10, 3]; // Index 0 unused, 1-4 for tiers
    const allowedSec = (allowances[tier] || 0) * 3600;

    // Billable missing hours (full hours only)
    let billableMissingSec = Math.max(0, missingSec - allowedSec);
    const billableHours = Math.floor(billableMissingSec / 3600); // Ignore partial hours

    // Deduction rate
    const deductionRatePerHour = Math.floor(basePay / 185);

    // Total deduction
    const salaryDeduction = billableHours * deductionRatePerHour;

    // Net pay
    let netPay = basePay - salaryDeduction;
    if (netPay < 0) netPay = 0; // Prevent negative

    return netPay;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
