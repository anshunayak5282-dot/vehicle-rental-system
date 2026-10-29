/**
 * VEHICLE FLEET MANAGEMENT & CATALOG SCRIPT
 */

let allVehicles = [];

// Load and render vehicles into a container
async function loadVehicles(containerId = 'vehiclesContainer', filter = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
      <div style="font-size: 1.5rem; margin-bottom: 10px;">⚡</div>
      Loading fleet catalog...
    </div>
  `;

  try {
    const res = await api.vehicles.getAll();
    allVehicles = res.vehicles || [];
    renderVehiclesList(allVehicles, containerId, filter);
  } catch (err) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--status-danger);">Failed to load vehicles.</div>`;
  }
}

function renderVehiclesList(list, containerId, filter = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let filtered = [...list];

  if (filter.type && filter.type !== 'all') {
    filtered = filtered.filter(v => v.vehicle_type.toLowerCase() === filter.type.toLowerCase());
  }

  if (filter.search) {
    const q = filter.search.toLowerCase();
    filtered = filtered.filter(v =>
      v.brand.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      v.vehicle_number.toLowerCase().includes(q)
    );
  }

  if (filter.status && filter.status !== 'all') {
    filtered = filtered.filter(v => v.status.toLowerCase() === filter.status.toLowerCase());
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <h3 style="margin-bottom: 8px; color: var(--text-main);">No Vehicles Matching Criteria</h3>
        <p>Try adjusting your search terms or filter criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(v => {
    const statusClass =
      v.status === 'Available' ? 'vehicle-badge-available' :
      v.status === 'Booked' ? 'vehicle-badge-booked' :
      v.status === 'Rented' ? 'vehicle-badge-rented' : 'vehicle-badge-maintenance';

    const isAvailable = v.status === 'Available';
    const pathNorm = window.location.pathname.replace(/\\/g, '/');
    const isInsidePages = pathNorm.includes('/pages/');
    const bookUrl = isInsidePages ? `../customer/booking.html?vehicleId=${v.id}` : `pages/customer/booking.html?vehicleId=${v.id}`;

    return `
      <div class="vehicle-card">
        <div class="vehicle-img-wrap">
          <img src="${v.image_url}" alt="${v.brand} ${v.model}" onerror="this.src='https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'">
          <div class="vehicle-status-badge ${statusClass}">${v.status}</div>
          <div class="vehicle-price-tag">${formatCurrency(v.rental_price)}<span>/day</span></div>
        </div>
        <div class="vehicle-card-body">
          <div class="vehicle-category">${v.vehicle_type} • ${v.fuel_type}</div>
          <h3 class="vehicle-name">${v.brand} ${v.model}</h3>
          
          <div class="vehicle-specs">
            <div class="spec-item">
              <span class="spec-label">Transmission</span>
              <span class="spec-val">${v.transmission}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Seats</span>
              <span class="spec-val">${v.seating_capacity} Seats</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Reg. Number</span>
              <span class="spec-val">${v.vehicle_number}</span>
            </div>
          </div>

          <div class="vehicle-card-footer">
            <a href="${bookUrl}" class="btn btn-primary" style="flex: 1; ${!isAvailable ? 'pointer-events: none; opacity: 0.5; filter: grayscale(1);' : ''}">
              ${isAvailable ? '⚡ Reserve Now' : 'Currently ' + v.status}
            </a>
            <button class="btn btn-secondary" onclick="viewVehicleModal(${v.id})">Details</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Modal inspection details
function viewVehicleModal(vehicleId) {
  const v = allVehicles.find(item => item.id === vehicleId);
  if (!v) return;

  let modal = document.getElementById('vehicleDetailModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'vehicleDetailModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>Vehicle Specifications & Overview</h3>
          <button class="modal-close" onclick="closeModal('vehicleDetailModal')">&times;</button>
        </div>
        <div class="modal-body" id="vehicleDetailModalBody"></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary js-modal-cancel" onclick="closeModal('vehicleDetailModal')">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const modalBody = document.getElementById('vehicleDetailModalBody');
  if (modalBody) {
    const pathNorm = window.location.pathname.replace(/\\/g, '/');
    const isInsidePages = pathNorm.includes('/pages/');
    const bookUrl = isInsidePages ? `../customer/booking.html?vehicleId=${v.id}` : `pages/customer/booking.html?vehicleId=${v.id}`;
    const isAvailable = v.status === 'Available';

    modalBody.innerHTML = `
      <div style="display: flex; gap: 20px; flex-direction: column;">
        <img src="${v.image_url}" style="width: 100%; height: 260px; object-fit: cover; border-radius: var(--radius-md);" onerror="this.src='https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'" />
        <div>
          <span class="badge badge-yellow">${v.vehicle_type}</span>
          <h2 style="margin: 8px 0;">${v.brand} ${v.model}</h2>
          <p style="color: var(--text-secondary); margin-bottom: 16px;">Registration: <strong>${v.vehicle_number}</strong> | Hub: <strong>${v.location || 'Mumbai - BKC Hub'}</strong></p>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: rgba(0,0,0,0.3); padding: 16px; border-radius: var(--radius-sm); margin-bottom: 20px;">
            <div><strong>Fuel:</strong> ${v.fuel_type}</div>
            <div><strong>Transmission:</strong> ${v.transmission}</div>
            <div><strong>Seating:</strong> ${v.seating_capacity} Persons</div>
            <div><strong>Odometer:</strong> ${v.mileage ? v.mileage.toLocaleString('en-IN') : '15,000'} km</div>
            <div><strong>Daily Rate:</strong> <span style="color: var(--accent-gold); font-weight: 700;">${formatCurrency(v.rental_price)} / day</span></div>
            <div><strong>Status:</strong> <span style="color: var(--status-available); font-weight: 600;">${v.status}</span></div>
          </div>

          <div style="display: flex; gap: 12px;">
            <a href="${bookUrl}" class="btn btn-primary" style="flex: 1; text-align: center; ${!isAvailable ? 'pointer-events: none; opacity: 0.5;' : ''}">
              ${isAvailable ? '⚡ Reserve This Vehicle' : 'Currently ' + v.status}
            </a>
          </div>
        </div>
      </div>
    `;
    openModal('vehicleDetailModal');
  }
}
