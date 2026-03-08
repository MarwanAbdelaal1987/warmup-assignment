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
    // TODO: Implement this function
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    // TODO: Implement this function
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    // TODO: Implement this function
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
    // TODO: Implement this function
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
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
    // TODO: Implement this function
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
    // TODO: Implement this function
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
