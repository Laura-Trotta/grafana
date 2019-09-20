package api

import (
	"github.com/grafana/grafana/pkg/bus"
	m "github.com/grafana/grafana/pkg/models"
)

/* Given a user id and a list of team names, the function
adds the user to the teams. If the user is part of teams which
are not present in the given list, the user is removed from said teams. */
func (hs *HTTPServer) addToTeams(userid int64, arrayFutureTeams []string, ctx *m.ReqContext) {

	allTeamsQuery := m.SearchTeamsQuery{OrgId: 1}

	//getting every team
	if err := bus.Dispatch(&allTeamsQuery); err != nil {
	}

	allTeamsArray := allTeamsQuery.Result.Teams

	//array of teamDto -> map of team names and team ids
	allTeams := make(map[string]int64)

	for _, teamDto := range allTeamsArray {
		allTeams[teamDto.Name] = teamDto.Id
	}

	//getting ids of new teams
	futureTeamsIds := make(map[int64]struct{})

	for _, teamName := range arrayFutureTeams {

		if teamID, ok := allTeams[teamName]; ok {
			futureTeamsIds[int64(teamID)] = struct{}{}
		}

	}

	//getting old teams
	query := m.GetTeamsByUserQuery{OrgId: 1, UserId: userid}

	if err := bus.Dispatch(&query); err != nil {
	}

	teamsDTOs := query.Result

	currentTeamsIds := make(map[int64]struct{})

	for _, singleteam := range teamsDTOs {
		currentTeamsIds[singleteam.Id] = struct{}{}
	}

	//removing user from old teams
	for id := range currentTeamsIds {
		if _, ok := futureTeamsIds[id]; !ok {

			cmd := &m.RemoveTeamMemberCommand{
				TeamId: id,
				OrgId:  1,
				UserId: userid,
			}

			err := bus.Dispatch(cmd)
			if err != nil {
				hs.redirectWithError(ctx, err)
				return
			}
		}
	}

	//adding user to new teams
	for id := range futureTeamsIds {

		if _, ok := currentTeamsIds[id]; !ok {

			cmd := &m.AddTeamMemberCommand{
				TeamId: id,
				OrgId:  1,
				UserId: userid,
			}

			err := bus.Dispatch(cmd)
			if err != nil {
				hs.redirectWithError(ctx, err)
				return
			}
		}
	}
}
