// Single source of truth for the sport list, used by both the PLP filters and
// the owner's turf creation/edit form -- so a turf's sport_type always matches
// something a player can actually filter by.
export const SPORT_OPTIONS = ['Football', 'Cricket', 'Badminton', 'Tennis', 'Basketball'];

// Simple emoji glyphs used next to names/labels around the app -- no image
// assets needed. Player = person, Turf/Owner = house.
export const PLAYER_ICON = '👤';
export const TURF_ICON = '🏠';
