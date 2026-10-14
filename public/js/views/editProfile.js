import { api } from '../api.js';
import { store } from '../store.js';
import { h, qs, avatar, escapeHtml, toast } from '../utils.js';
import { changeAvatarSheet } from './profile.js';

export default async function editProfile(root) {
  const { user: me } = await api.get('/auth/me');
  const el = h(`
    <div class="edit-profile">
      <h2 class="page-title">Edit profile</h2>
      <div class="ep-card">
        ${avatar(me, 56)}
        <div class="user-row-text"><b>${escapeHtml(me.username)}</b><span class="user-row-sub">${escapeHtml(me.fullName)}</span></div>
        <button type="button" class="btn btn-primary change-photo">Change photo</button>
      </div>

      <form class="ep-form">
        <label>Name<input name="fullName" maxlength="60" value="${escapeHtml(me.fullName)}" /></label>
        <label>Username<input name="username" maxlength="30" value="${escapeHtml(me.username)}" required /></label>
        <label>Website<input name="website" maxlength="100" placeholder="Website" value="${escapeHtml(me.website)}" /></label>
        <label>Bio<textarea name="bio" maxlength="150" rows="3">${escapeHtml(me.bio)}</textarea><small class="char-count"><span>${me.bio.length}</span> / 150</small></label>
        <label>Gender
          <select name="gender">
            ${[['', 'Prefer not to say'], ['female', 'Female'], ['male', 'Male'], ['custom', 'Custom']].map(([v, l]) => `<option value="${v}" ${me.gender === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
        <button class="btn btn-primary ep-submit" type="submit">Submit</button>
      </form>

      <h2 class="page-title">Change password</h2>
      <form class="ep-form pw-form">
        <label>Current password<input name="currentPassword" type="password" autocomplete="current-password" required /></label>
        <label>New password<input name="newPassword" type="password" minlength="6" autocomplete="new-password" required /></label>
        <button class="btn btn-primary ep-submit" type="submit">Change password</button>
      </form>
    </div>`);
  root.append(el);

  qs('.change-photo', el).addEventListener('click', () =>
    changeAvatarSheet((url) => (qs('.ep-card img', el).src = url || '/img/default-avatar.svg'))
  );
  const bio = qs('[name=bio]', el);
  bio.addEventListener('input', () => (qs('.char-count span', el).textContent = bio.value.length));

  qs('.ep-form', el).addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const { user } = await api.put('/users/me', Object.fromEntries(new FormData(e.target)));
      store.setMe(user);
      toast('Profile saved.');
    } catch (err) {
      toast(err.message);
    }
  });

  qs('.pw-form', el).addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/password', Object.fromEntries(new FormData(e.target)));
      e.target.reset();
      toast('Password changed.');
    } catch (err) {
      toast(err.message);
    }
  });
}
