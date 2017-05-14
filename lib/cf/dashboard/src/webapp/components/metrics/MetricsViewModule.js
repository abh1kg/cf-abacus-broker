/* eslint-disable max-len,no-var */
angular.module('MetricsViewModule', ['ResourceProviderService', 'MessageBoxService'])
    .controller('MetricsViewController', ['ResourceProviderFactory', '$scope', '$stateParams', '$location', 'MessageBox', '$rootScope', function(ResourceProviderFactory, $scope, $routeParams, $location, MessageBox, $rootScope) {
      let vm = this;
      $scope.plan = ResourceProviderFactory.getPlan();
      $scope.planId = $routeParams.plan_id;
      $scope.instance_id = $routeParams.instance_id;
      $scope.binding_id = $routeParams.binding_id;
      $scope.metric_name = $routeParams.metric_name;
      $scope.selectedPane = null;
      $scope.dropdown = ResourceProviderFactory.getMetricsDropdown($scope.plan, $scope.metric_name, $scope);
      vm.initController = function() {
        vm.setFlags();
        ResourceProviderFactory.openLoadingSpinner();
        $scope.metric = {};
        if (ResourceProviderFactory.getMetricCreateMode()) 
          ResourceProviderFactory.getSampleFunctions().then(function(response) {
            $scope.templates = response.data;
            _.forOwn($scope.templates, function(value, key) {
              $scope.metric[key] = value;
            });
            $scope.metric.type = 'discrete';
          });
            
        ResourceProviderFactory.getMeteringPlan($routeParams.plan_id).then(function(response) {
          $scope.plan = response.data;
          vm.plan = $scope.plan;
          $scope.metric = _.find($scope.plan.metrics, {
            'name': $routeParams.metric_name
          }) || $scope.metric;
          ResourceProviderFactory.closeLoadingSpinner();
        }, function(response) {
          $scope.plan = {};
          ResourceProviderFactory.closeLoadingSpinner();
          MessageBox.openErrorBox(ResourceProviderFactory.constructErrorMessage('ResourceProvider_ErrorBox_GetPlan_XMSG', $scope.planId, response.statusText));
        });
      };

      vm.setFlags = function() {
        $scope.isReadOnly = !ResourceProviderFactory.getMetricCreateMode();
        $scope.isCreateMetricMode = !ResourceProviderFactory.getMetricCreateMode();
      };

      vm.onLoad = function(editor) {
        editor.setShowPrintMargin(false);
        $scope.editor = editor;
        $scope.editor.setOptions({
          minLines: 10,
          wrap: true,
          firstLineNumber: 1,
          enableBasicAutocompletion: true,
          enableSnippets: true,
          enableLiveAutocompletion: true
        });
      };

      vm.onEditMetricClick = function() {
        vm.resetReadOnly();
            // keep a copy of metric
        $scope.metricCopy = angular.copy($scope.metric);
      };


      vm.navigateBackToMetering = function() {
        if (ResourceProviderFactory.getMetricCreateMode()) {
          $location.path($location.$$path.substr(0, $location.$$path.lastIndexOf('/')));
          ResourceProviderFactory.resetMetricCreateMode();
        }
        else {
          let path = $location.$$path.substr(0, $location.$$path.lastIndexOf('/'));
          $location.path(path.substr(0, path.lastIndexOf('/')));
        }

      };

      vm.onCancelMetricClick = function() {
        if (ResourceProviderFactory.getMetricCreateMode()) {
          vm.setFlags();
                // navigate back to metering view;
          vm.navigateBackToMetering();
        }
        else {
          vm.setReadOnly();
          $scope.metric = $scope.metricCopy;
          $scope.paneChanged();
        }
      };

      vm.onDeleteMetricClick = function(metric) {
        var metric = $scope.metric;
        let title = ResourceProviderFactory.getMessage('ResourceProvider_Metric_DeleteAction_Box_XTIT');
        let message = ResourceProviderFactory.getMessage('ResourceProvider_Metric_DeleteAction_Box_XMSG') + ' "' + metric.name + '" ?';
        $scope.messageBoxInstance = MessageBox.openMessageBox(title,message);
        $scope.messageBoxInstance.result.then(function() {
          vm.onDeleteMetricConfirm(metric);
        });

      };

      vm.onDeleteMetricConfirm = function() {
        let planCopy = angular.copy($scope.plan);
            // keep metric copy on failure assign it to original
        let metricCopy = angular.copy($scope.metric);
        _.remove(planCopy.metrics, {
          'name': metricCopy.name
        });
        ResourceProviderFactory.openLoadingSpinner();
        ResourceProviderFactory.updateMeteringPlan(planCopy.plan_id, planCopy).then(function() {
          vm.setReadOnly();
          ResourceProviderFactory.closeLoadingSpinner();
          vm.navigateBackToMetering();
        }, function(response) {
          vm.setReadOnly();
          ResourceProviderFactory.closeLoadingSpinner();
          MessageBox.openErrorBox(ResourceProviderFactory.constructErrorMessage('ResourceProvider_ErrorBox_UpdateMetric_XMSG', metricCopy.name, response.statusText));
        });
      };

      vm.onAddMetricConfirm = function() {
        let planCopy = angular.copy($scope.plan);
            // keep metric copy on failure assign it to original
        var metricCopy = angular.copy($scope.metric);
        var metricCopy = angular.copy($scope.metric);
        planCopy.metrics.push(metricCopy);
        ResourceProviderFactory.openLoadingSpinner();
        ResourceProviderFactory.updateMeteringPlan(planCopy.plan_id, planCopy).then(function() {
          ResourceProviderFactory.closeLoadingSpinner();
          vm.navigateBackToMetering();
        }, function(response) {
          ResourceProviderFactory.closeLoadingSpinner();
          vm.navigateBackToMetering();
          MessageBox.openErrorBox(ResourceProviderFactory.constructErrorMessage('ResourceProvider_ErrorBox_UpdateMetric_XMSG', metricCopy.name, response.statusText));

        });
      };

      vm.onUpdateMetricConfirm = function() {
        let planCopy = angular.copy($scope.plan);
            // keep metric copy on failure assign it to original
        let metricCopy = angular.copy($scope.metric);
        metricCopy = _.omitBy(metricCopy, _.isEmpty);
        let index = _.findIndex($scope.plan.metrics, {
          'name': metricCopy.name
        });
        planCopy.metrics[index] = metricCopy;
        ResourceProviderFactory.updateMeteringPlan(planCopy.plan_id, planCopy).then(function() {
          vm.setReadOnly();
          ResourceProviderFactory.closeLoadingSpinner();
        }, function(response) {
          vm.setReadOnly();
          $scope.metric = $scope.metricCopy;
          $scope.paneChanged();
          ResourceProviderFactory.closeLoadingSpinner();
          MessageBox.openErrorBox(ResourceProviderFactory.constructErrorMessage('ResourceProvider_ErrorBox_UpdateMetric_XMSG', metricCopy.name, response.statusText));
        });

      };

      vm.onSaveMetricClick = function() {
        ResourceProviderFactory.openLoadingSpinner();
        if (ResourceProviderFactory.getMetricCreateMode()) 
          vm.onAddMetricConfirm();
        else 
                vm.onUpdateMetricConfirm();
            
      };

      vm.setReadOnly = function() {
        $scope.isReadOnly = true;
      };

      vm.resetReadOnly = function() {
        $scope.isReadOnly = false;
      };

      $scope.paneChanged = function(localPane) {
    	var pane = localPane;
        if (localPane) 
          $scope.selectedPane = pane;
        else 
          pane = $scope.selectedPane;
            

        if (pane.title === 'Details') 
          $scope.showAceEditor = false;
        else {
          if ($scope.plan && $scope.plan.metrics) {
            let funcValue = $scope.metric[pane.title.toLowerCase()];
            $scope.editor.getSession().setValue(funcValue || '');
          }
          $scope.showAceEditor = true;
        }
      };

      vm.onChange = function() {
        let newValue = $scope.editor.getSession().getValue();
        let selectedPane = $scope.selectedPane.title.toLowerCase();
        if (selectedPane !== 'details') 
          $scope.metric[selectedPane] = newValue;
            
      };

      $scope.tabChanged = function(tab) {
        $scope.selectedTab = tab;
      };

      vm.initController();
    }])
    .directive('tabs', function() {
      return {
        restrict: 'E',
        transclude: true,
        scope: {
          paneChanged: '&'
        },
        controller: function($scope, $element) {
          let panes = $scope.panes = [];
          let preSelected = null;
          $scope.isSelected = function(pane) {
            let preSelected = $scope.$parent.selectedPane;
                    // console.log("preSelected "+preSelected.title+" pane "+pane.title);
            if (preSelected) {
              if (preSelected.title === pane.title) {
                pane.selected = true;
                return true;
              } 
                            // by default first element is visible   
              pane.selected = false;
              return false;
                        
            } 
            return pane.selected;
                    


          };
          $scope.select = function(pane) {
            pane.selected = true;
            $scope.paneChanged({
              selectedPane: pane
            });
          };

          this.addPane = function(pane) {
            if (panes.length == 0 && !preSelected) 
              pane.selected = true;
            else 
                        pane.selected = false;
                    
            panes.push(pane);
          };
        },
        template: '<div class="tabbable">' +
                '<ul class="nav nav-tabs tabs-advanced">' +
                '<li ng-repeat="pane in panes" ng-class="{active:isSelected(pane)}">' +
                '<a href="" ng-click="select(pane)">{{pane.title}}</a>' +
                '</li>' +
                '</ul>' +
                '<div class="tab-content" ng-transclude></div>' +
                '</div>',
        replace: true
      };
    })
    .directive('pane', function() {
      return {
        require: '^tabs',
        restrict: 'E',
        transclude: true,
        scope: {
          title: '@'
        },
        link: function(scope, element, attrs, tabsCtrl) {
          tabsCtrl.addPane(scope);
        },
        template: '<div class="tab-pane" ng-class="{active: selected}" ng-transclude>' +
                '</div>',
        replace: true
      };
    });