// The guest list. Each party RSVPs together, and only the people listed
// in a party can come.
//
// IMPORTANT: if you change this list, make the same change to PARTIES in
// rsvp/Code.gs (the RSVP service), or those guests won't be able to RSVP.
// "id" must stay the same once people start RSVPing.

window.GUEST_PARTIES = [
  { id: 'mama', members: ['Mama'] },
  { id: 'papa', members: ['Papa'] },
  { id: 'joe-gianna-michael', members: ['Joe', 'Gianna', 'Michael'] },
  { id: 'anthony-maya', members: ['Anthony', 'Maya'] },
  { id: 'donavon-izy', members: ['Donavon', 'Izy'] },
  { id: 'marcus', members: ['Marcus'] },
  { id: 'meme-papple', members: ['Meme', 'Papple'] },
  { id: 'colleen-david', members: ['Grandma Colleen', 'Grandpa David'] },
  { id: 'kelcys-nelli', members: ['Kelcys', 'Nelli'] },
  { id: 'samara-austin', members: ['Samara', 'Austin'] },
  { id: 'kailey', members: ['Kailey'] },
  { id: 'jackie', members: ['Jackie'] },
  { id: 'christa-greg-ava-michael', members: ['Christa', 'Greg', 'Ava', 'Michael'] },
  { id: 'heather-jeff-ian-vincent', members: ['Heather', 'Jeff', 'Ian', 'Vincent'] },
  { id: 'pj-shanna', members: ['PJ', 'Shanna'] },
  { id: 'amy-randy-esther-jackson', members: ['Amy', 'Randy', 'Esther', 'Jackson'] },
  { id: 'sassy-david', members: ['Sassy', 'David'] },
  { id: 'mema-papa', members: ['Mema', 'Pa Pa'] },
  { id: 'grandpa-cader', members: ['Grandpa Cader'] },
  { id: 'gabe', members: ['Gabe'] },
  { id: 'timmy-mady-mom', members: ['Timmy', 'Mady', "Timmy's Mom"] },
  { id: 'joel', members: ['Joel'] },
  { id: 'moses', members: ['Moses'] },
  { id: 'kadence-steaven', members: ['Kadence', 'Steaven'] },
  { id: 'matthew', members: ['Matthew'] },
  { id: 'regon', members: ['Reagan'] },
];
