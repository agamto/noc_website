import React, { ChangeEvent,useState } from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { css } from '@emotion/css';
import { Button, Field, Input, useStyles2 } from '@grafana/ui';
import './AddUser.css';
type State = {
    userName: string;
    phoneNumber: string;
    team: string;
}
type Props = {
  addNewUser: (phoneNumber: string, userName: string, team: string) => void;
};
export const AddUser: React.FC<Props> = ({ addNewUser }) => {
  const s = useStyles2(getStyles);
  const [state, setState] = useState<State>({
    userName: '',
    phoneNumber: '',
    team: ''
  });
    const isSubmitDisabled = Boolean(!state.userName || !state.phoneNumber || !state.team);
    const onStateChange = (event: ChangeEvent<HTMLInputElement>) => {
        setState({...state, [event.target.name]: event.target.value});
    };
    const onSubmit = () => {
    if (isSubmitDisabled) {
      return;
    }
    addNewUser(state.userName,state.phoneNumber,state.team);
    };
    return (
        <div className={s.container}>
            <form onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
              }}>
                <div className="add-user-card" role="group" aria-labelledby="add-user-title">
                  <div id="add-user-title" className="add-user-card-title">add user</div>
                    <Field>
                        <Input
                          width={60}
                          name="userName"
                          id="userName"
                          value={state.userName}
                          placeholder={`E.g.: omer`}
                          onChange={onStateChange}
                        />
                    </Field>
                    <Field>
                        <Input
                          width={60}
                          name="phoneNumber"
                          id="phoneNumber"
                          value={state.phoneNumber}
                          placeholder={`E.g.: 05xxxxxxxx`}
                          onChange={onStateChange}
                        />
                    </Field>
                    <Field>
                        <Input
                          width={60}
                          name="team"
                          id="team"
                          value={state.team}
                          placeholder={`E.g.: aws sky`}
                          onChange={onStateChange}
                        />
                    </Field>
                    <div className={`${s.marginTop} add-user-actions`}>
                      <Button title="Save User" type='submit' disabled={isSubmitDisabled}>
                        Save User
                      </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}
const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    width: 100vw;
    max-width: 100%;
    display:flex;
    justify-content: center;
    align-items: center;
    margin-bottom: ${theme.spacing(3)};
  `,
    marginTop: css`
    margin-top: ${theme.spacing(3)};
  `,
  centered: css`
    display:flex;
    justify-content: center;
    align-items: center;
  `,
});

