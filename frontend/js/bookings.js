/**
 * BOOKING WORKFLOW, PRICING CALCULATOR & LIFECYCLE MANAGEMENT
 */

// Calculate live price breakdown for booking form
function calculateBookingPrice(dailyRate) {
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const driverCheckbox = document.getElementById('driverRequired');
  const insuranceCheckbox = document.getElementById('insuranceOpted');

  if (!startDateInput || !endDateInput) return;

  const startVal = startDateInput.value;
  const endVal = endDateInput.value;

  if (!startVal || !endVal) {
    updateBreakdownDisplay(1, dailyRate, 0, 0, dailyRate, Math.round(dailyRate * 0.1), Math.round(dailyRate * 1.1));
    return;
  }

  const start = new Date(startVal);
  const end = new Date(endVal);
  const diffTime = end - start;
  let days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (days <= 0) days = 1;

  const vehicleCost = dailyRate * days;
  const driverFee = (driverCheckbox && driverCheckbox.checked) ? 1500 * days : 0;
  const insuranceFee = (insuranceCheckbox && insuranceCheckbox.checked) ? 1000 * days : 0;

  const subtotal = vehicleCost + driverFee + insuranceFee;
  const tax = Math.round(subtotal * 0.1);
  const grandTotal = subtotal + tax;

  updateBreakdownDisplay(days, vehicleCost, driverFee, insuranceFee, subtotal, tax, grandTotal);
}

function updateBreakdownDisplay(days, vehicleCost, driverFee, insuranceFee, subtotal, tax, grandTotal) {
  const elDays = document.getElementById('summaryDays');
  const elVehicle = document.getElementById('summaryVehicleCost');
  const elDriver = document.getElementById('summaryDriverFee');
  const elInsurance = document.getElementById('summaryInsuranceFee');
  const elSubtotal = document.getElementById('summarySubtotal');
  const elTax = document.getElementById('summaryTax');
  const elTotal = document.getElementById('summaryGrandTotal');

  if (elDays) elDays.textContent = `${days} Day(s)`;
  if (elVehicle) elVehicle.textContent = formatCurrency(vehicleCost);
  if (elDriver) elDriver.textContent = formatCurrency(driverFee);
  if (elInsurance) elInsurance.textContent = formatCurrency(insuranceFee);
  if (elSubtotal) elSubtotal.textContent = formatCurrency(subtotal);
  if (elTax) elTax.textContent = formatCurrency(tax);
  if (elTotal) elTotal.textContent = formatCurrency(grandTotal);
}

// Submit new booking
async function handleBookingSubmit(event, selectedVehicle) {
  event.preventDefault();

  const user = auth.getUser();
  if (user && auth.checkProfileCompleteness) {
    const completeness = auth.checkProfileCompleteness(user);
    if (!completeness.isComplete) {
      showToast(`Profile Incomplete (${completeness.percentage}%). Complete all 7 fields before booking: ${completeness.missing.join(', ')}`, 'error');
      setTimeout(() => {
        if (confirm(`⚠️ Profile Incomplete (${completeness.percentage}%)\n\nVehicle reservations require 100% completed profile.\nMissing fields:\n• ${completeness.missing.join('\n• ')}\n\nWould you like to complete your profile now?`)) {
          window.location.href = 'profile.html';
        }
      }, 350);
      return;
    }
  }

  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const pickup = (document.getElementById('pickupLocation')?.value || '').trim();
  const drop = (document.getElementById('dropLocation')?.value || '').trim();
  const driverRequired = document.getElementById('driverRequired')?.checked || false;
  const insuranceOpted = document.getElementById('insuranceOpted')?.checked || true;
  const notes = document.getElementById('bookingNotes')?.value || '';

  if (!startDate || !endDate) {
    showToast('Please select valid start and return dates.', 'error');
    return;
  }

  if (!pickup || pickup.length < 3) {
    showToast('Please specify a valid pickup location address (minimum 3 characters).', 'error');
    document.getElementById('pickupLocation')?.focus();
    return;
  }

  if (!drop || drop.length < 3) {
    showToast('Please specify a valid return/drop location address (minimum 3 characters).', 'error');
    document.getElementById('dropLocation')?.focus();
    return;
  }

  const payload = {
    customer_id: user ? (user.id || user._id) : 2,
    customer_name: user ? (user.full_name || user.name) : 'Customer Renter',
    customer_email: user ? user.email : 'customer@gmail.com',
    customer_phone: user ? user.phone : null,
    vehicle_id: selectedVehicle.id,
    start_date: startDate,
    end_date: endDate,
    driver_required: driverRequired,
    insurance_opted: insuranceOpted,
    pickup_location: pickup,
    drop_location: drop,
    notes
  };

  try {
    const res = await api.bookings.create(payload);
    showToast('Booking submitted successfully! Awaiting verification & approval.', 'success');
    setTimeout(() => {
      window.location.href = 'bookings.html';
    }, 1200);
  } catch (err) {
    if (err.data && err.data.profile_incomplete) {
      showToast(err.message, 'error');
      setTimeout(() => {
        if (confirm(`${err.message}\n\nGo to your Profile page now?`)) {
          window.location.href = 'profile.html';
        }
      }, 400);
    } else {
      showToast(err.message || 'Failed to submit booking.', 'error');
    }
  }
}

// Lifecycle Actions (for Managers, Admins, Receptionists)
async function approveBooking(bookingId) {
  if (!confirm(`Are you sure you want to approve Booking #${bookingId}?`)) return;
  try {
    await api.bookings.approve(bookingId);
    showToast(`Booking #${bookingId} has been Approved!`, 'success');
    if (typeof loadAllBookings === 'function') loadAllBookings();
  } catch (err) {
    showToast('Failed to approve booking.', 'error');
  }
}

async function rejectBooking(bookingId) {
  const reason = prompt('Please specify rejection reason:');
  if (reason === null) return;
  try {
    await api.bookings.reject(bookingId, { reason });
    showToast(`Booking #${bookingId} has been Rejected.`, 'info');
    if (typeof loadAllBookings === 'function') loadAllBookings();
  } catch (err) {
    showToast('Failed to reject booking.', 'error');
  }
}

async function cancelBooking(bookingId) {
  if (!confirm(`Cancel Booking #${bookingId}?`)) return;
  try {
    await api.bookings.cancel(bookingId);
    showToast(`Booking #${bookingId} has been Cancelled.`, 'info');
    if (typeof loadCustomerBookings === 'function') loadCustomerBookings();
    if (typeof loadAllBookings === 'function') loadAllBookings();
  } catch (err) {
    showToast('Failed to cancel booking.', 'error');
  }
}
