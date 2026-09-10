import React, { useState } from 'react';
import './UsersTable.css';

type User = {
  id: number;
  username: string;
  team: string;
  phonenumber: string;
};

type Props = {
  users: User[];
  page: number;
  totalUsers: number;
  usernames: string[];
  teams: string[];
  userFilter: string;
  teamFilter: string;
  totalPages: number;
  onPageChange: (page: number) => void;
  onUserFilterChange: (user: string) => void;
  onTeamFilterChange: (team: string) => void;
  onDelete: (id: number) => void;
  onUpdate: (
    id: number,
    userName: string,
    phoneNumber: string,
    team: string
  ) => Promise<void>;
};

export const UsersTable: React.FC<Props> = ({
  users,
  onDelete,
  onUpdate,
  page,
  totalUsers,
  totalPages,
  usernames,
  teams,
  userFilter,
  teamFilter,
  onPageChange,
  onUserFilterChange,
  onTeamFilterChange,
}) => {
  const [sortColumn, setSortColumn] = useState<keyof User | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSort = (column: keyof User) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortColumn) {return 0;}

    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    }

    return 0;
  });

  const handleSave = async () => {
    if (!editingUser) {return;}

    setSaving(true);

    try {
      await onUpdate(
        editingUser.id,
        editingUser.username,
        editingUser.phonenumber,
        editingUser.team
      );

      setEditingUser(null);
    } finally {
      setSaving(false);
    }
  };

  const sortIcon = (column: keyof User) => {
    if (sortColumn !== column) {return '↕';}
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const handleDeleteClick = (userId: number) => {
    if (pendingDeleteUserId === userId) {
      onDelete(userId);
      setPendingDeleteUserId(null);
      return;
    }

    setPendingDeleteUserId(userId);
  };

  const suggestedTeam = teamFilter
    ? teams.find((team) => {
        const normalizedTeam = team.toLocaleLowerCase();
        const normalizedFilter = teamFilter.toLocaleLowerCase();
        return normalizedTeam.startsWith(normalizedFilter) && normalizedTeam !== normalizedFilter;
      })
    : undefined;

  const suggestedUsername = userFilter
    ? usernames.find((username) => {
        const normalizedUsername = username.toLocaleLowerCase();
        const normalizedFilter = userFilter.toLocaleLowerCase();
        return normalizedUsername.startsWith(normalizedFilter) && normalizedUsername !== normalizedFilter;
      })
    : undefined;

  return (
    <div className="users-page">
      <div className="users-card">

        {/* Header */}
        <div className="users-header">
          <div>
            <h2>Users</h2>
            <p>Manage your users and teams</p>
          </div>

          <span className="user-count">
            {totalUsers} users
          </span>
        </div>

        <div className="table-filters">
          <div className="table-filter-field">
            <label htmlFor="user-filter">Filter by user</label>
            <div className="user-autocomplete">
              {suggestedUsername && (
                <div id="user-filter-suggestions" className="user-autocomplete-suggestion" role="listbox" dir="auto">
                  <span role="option" aria-selected="true">{suggestedUsername}</span>
                </div>
              )}
              <input
                id="user-filter"
                className="user-filter-input"
                type="search"
                dir="auto"
                role="combobox"
                aria-autocomplete="both"
                aria-expanded={Boolean(suggestedUsername)}
                aria-controls={suggestedUsername ? 'user-filter-suggestions' : undefined}
                value={userFilter}
                onChange={(event) => onUserFilterChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Tab' && suggestedUsername) {
                    event.preventDefault();
                    onUserFilterChange(suggestedUsername);
                  }
                }}
                placeholder="User name"
              />
            </div>
          </div>
          <div className="table-filter-field">
            <label htmlFor="team-filter">Filter by team</label>
            <div className="team-autocomplete">
              {suggestedTeam && (
                <div id="team-filter-suggestions" className="team-autocomplete-suggestion" role="listbox" dir="auto">
                  <span role="option" aria-selected="true">{suggestedTeam}</span>
                </div>
              )}
              <input
                id="team-filter"
                className="team-filter-input"
                type="search"
                dir="auto"
                role="combobox"
                aria-autocomplete="both"
                aria-expanded={Boolean(suggestedTeam)}
                aria-controls={suggestedTeam ? 'team-filter-suggestions' : undefined}
                value={teamFilter}
                onChange={(event) => onTeamFilterChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Tab' && suggestedTeam) {
                    event.preventDefault();
                    onTeamFilterChange(suggestedTeam);
                  }
                }}
                placeholder="Team name"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('username')}>
                  Username
                  <span>{sortIcon('username')}</span>
                </th>

                <th onClick={() => handleSort('team')}>
                  Team
                  <span>{sortIcon('team')}</span>
                </th>

                <th onClick={() => handleSort('phonenumber')}>
                  Phone
                  <span>{sortIcon('phonenumber')}</span>
                </th>

                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <div className="empty-icon">👥</div>
                      <h3>No users found</h3>
                      <p>Try changing your search.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user) => {
                  const isEditing = editingUser?.id === user.id;
                  const isDeletePending = pendingDeleteUserId === user.id;

                  return (
                    <tr key={user.id}>

                      {/* Username */}
                      <td>
                        {isEditing ? (
                          <input
                            className="edit-input" aria-label={`Edit username for user ${user.id}`}
                            value={editingUser.username}
                            onChange={(e) =>
                              setEditingUser({
                                ...editingUser,
                                username: e.target.value,
                              })
                            }
                          />
                        ) : (
                          <div className="username">
                            <div className="avatar">
                              {user.username.charAt(0).toUpperCase()}
                            </div>

                            {user.username}
                          </div>
                        )}
                      </td>

                      {/* Team */}
                      <td>
                        {isEditing ? (
                          <input
                            className="edit-input"
                            value={editingUser.team}
                            onChange={(e) =>
                              setEditingUser({
                                ...editingUser,
                                team: e.target.value,
                              })
                            }
                          />
                        ) : (
                          <span className="team-badge">
                            {user.team}
                          </span>
                        )}
                      </td>

                      {/* Phone */}
                      <td>
                        {isEditing ? (
                          <input
                            className="edit-input"
                            value={editingUser.phonenumber}
                            onChange={(e) =>
                              setEditingUser({
                                ...editingUser,
                                phonenumber: e.target.value,
                              })
                            }
                          />
                        ) : (
                          <span className="phone">
                            {user.phonenumber}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="actions">
                          {isEditing ? (
                            <>
                              <button
                                className="btn btn-save"
                                onClick={handleSave}
                                disabled={saving}
                              >
                                {saving ? 'Saving...' : '✓ Save'}
                              </button>

                              <button
                                className="btn btn-cancel"
                                onClick={() => setEditingUser(null)}
                                disabled={saving}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-edit"
                                onClick={() => {
                                  setPendingDeleteUserId(null);
                                  setEditingUser(user);
                                }}
                              >
                                ✎ Edit
                              </button>

                              <button
                                className="btn btn-delete"
                                onClick={() => handleDeleteClick(user.id)}
                              >
                                {isDeletePending ? 'Confirm delete' : '🗑 Delete'}
                              </button>

                              {isDeletePending && (
                                <button
                                  className="btn btn-cancel"
                                  onClick={() => setPendingDeleteUserId(null)}
                                >
                                  Cancel
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>

          <div className="pagination-buttons">
            <button
              className="page-btn"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
            >
              ←
            </button>

            {Array.from(
              { length: totalPages },
              (_, i) => i + 1
            ).map((p) => (
              <button
                key={p}
                className={`page-btn ${
                  page === p ? 'active' : ''
                }`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            ))}

            <button
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
