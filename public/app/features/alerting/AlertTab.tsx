// Libraries
import React, { PureComponent } from 'react';

// Services & Utils
import { AngularComponent, getAngularLoader } from '@grafana/runtime';
import appEvents from 'app/core/app_events';

// Components
import { EditorTabBody, EditorToolbarView } from '../dashboard/panel_editor/EditorTabBody';
import EmptyListCTA from 'app/core/components/EmptyListCTA/EmptyListCTA';
import StateHistory from './StateHistory';
import 'app/features/alerting/AlertTabCtrl';
import { Alert } from '@grafana/ui';

// Types
import { DashboardModel } from '../dashboard/state/DashboardModel';
import { PanelModel } from '../dashboard/state/PanelModel';
import { TestRuleResult } from './TestRuleResult';
import { AppNotificationSeverity } from 'app/types';

interface Props {
  angularPanel?: AngularComponent;
  dashboard: DashboardModel;
  panel: PanelModel;
}

export class AlertTab extends PureComponent<Props> {
  element: any;
  component: AngularComponent;
  panelCtrl: any;

  componentDidMount() {
    if (this.shouldLoadAlertTab()) {
      this.loadAlertTab();
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.shouldLoadAlertTab()) {
      this.loadAlertTab();
    }
  }

  shouldLoadAlertTab() {
    return this.props.angularPanel && this.element && !this.component;
  }

  componentWillUnmount() {
    if (this.component) {
      this.component.destroy();
    }
  }

  loadAlertTab() {
    const { angularPanel } = this.props;

    const scope = angularPanel.getScope();

    // When full page reloading in edit mode the angular panel has on fully compiled & instantiated yet
    if (!scope.$$childHead) {
      setTimeout(() => {
        this.forceUpdate();
      });
      return;
    }

    this.panelCtrl = scope.$$childHead.ctrl;
    const loader = getAngularLoader();
    const template = '<alert-tab />';

    const scopeProps = { ctrl: this.panelCtrl };

    this.component = loader.load(this.element, scopeProps, template);
  }

  stateHistory = (): EditorToolbarView => {
    return {
      title: 'State history',
      render: () => {
        return (
          <StateHistory
            dashboard={this.props.dashboard}
            panelId={this.props.panel.id}
            onRefresh={this.panelCtrl.refresh}
          />
        );
      },
    };
  };

  deleteAlert = (): EditorToolbarView => {
    const { panel } = this.props;
    return {
      title: 'Delete',
      btnType: 'danger',
      onClick: () => {
        appEvents.emit('confirm-modal', {
          title: 'Delete Alert',
          text: 'Are you sure you want to delete this alert rule?',
          text2: 'You need to save dashboard for the delete to take effect',
          icon: 'fa-trash',
          yesText: 'Delete',
          onConfirm: () => {
            delete panel.alert;
            panel.thresholds = [];
            this.panelCtrl.alertState = null;
            this.panelCtrl.render();
            this.forceUpdate();
          },
        });
      },
    };
  };

  renderTestRuleResult = () => {
    const { panel, dashboard } = this.props;
    return <TestRuleResult panelId={panel.id} dashboard={dashboard} />;
  };

  testRule = (): EditorToolbarView => ({
    title: 'Test Rule',
    render: () => this.renderTestRuleResult(),
  });

  onAddAlert = () => {
    this.panelCtrl._enableAlert();
    this.component.digest();
    this.forceUpdate();
  };

  render() {
    const { alert, transformations } = this.props.panel;
    const hasTransformations = transformations && transformations.length;

    if (!alert && hasTransformations) {
      return (
        <EditorTabBody heading="Alert">
          <Alert
            severity={AppNotificationSeverity.Warning}
            title="Transformations are not supported in alert queries"
          />
        </EditorTabBody>
      );
    }

    const toolbarItems = alert ? [this.stateHistory(), this.testRule(), this.deleteAlert()] : [];

    const model = {
      title: 'Panel has no alert rule defined',
      buttonIcon: 'gicon gicon-alert',
      onClick: this.onAddAlert,
      buttonTitle: 'Create Alert',
    };

    return (
      <EditorTabBody heading="Alert" toolbarItems={toolbarItems}>
        <>
          {alert && hasTransformations && (
            <Alert
              severity={AppNotificationSeverity.Error}
              title="Transformations are not supported in alert queries"
            />
          )}

          <div ref={element => (this.element = element)} />
          {!alert && <EmptyListCTA {...model} />}
        </>
      </EditorTabBody>
    );
  }
}
