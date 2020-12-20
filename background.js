/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2020 */

async function migrate() {
  console.log("Starting loading background.js");
  let legacyprefs = await messenger.todo.verifyTodoCalendar();
  console.log("Finished loading background.js");
}

migrate();
