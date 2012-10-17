'use strict';

define(['mdl','database','opendatakit','controller','backbone','handlebars','promptTypes','builder','jquery','underscore', 'handlebarsHelpers'],
function(mdl,  database,  opendatakit,  controller,  Backbone,  Handlebars,  promptTypes,  builder,  $,       _) {

promptTypes.base = Backbone.View.extend({
    className: "current",
    type: "base",
    database: database,
    mdl: mdl,
    constraint_message: "Constraint violated.",
    // track how many times we've tried to retrieve and compile the 
    // handlebars template for this prompt.
    initializeTemplateMaxTryCount: 4,
    initializeTemplateTryCount: 0,
    initializeTemplateFailed: false,
    //renderContext is a dynamic object to be passed into the render function.
    //renderContext is meant to be private.
    renderContext: {},
    //Template context is an user specified object that overrides the render context.
    templateContext: {},
    //base html attributes shouldn't be overridden by the user.
    //they should use htmlAttributes for that.
    baseHtmlAttributes: {},
    htmlAttributes: {},
    initialize: function() {
        this.initializeTemplate();
        this.initializeRenderContext();
        this.afterInitialize();
    },
    whenTemplateIsReady: function(callback){
        var that = this;
        if(this.template){
            callback();
        } else if(this.templatePath) {
            requirejs(['text!'+this.templatePath], function(source) {
                that.template = Handlebars.compile(source);
                callback();
            });
        } else {
            alert("No template for prompt: " + prompt.name);
            console.error(this);
        }
    },

    initializeTemplate: function() {
        return;
        /*
        //if (this.template != null) return;
        var that = this;
        var f = function() {
            if(that.templatePath){
                that.initializeTemplateTryCount++;
                requirejs(['text!'+that.templatePath], function(source) {
                    that.template = Handlebars.compile(source);
                }, function(err) {
                    if ( err.requireType == "timeout" ) {
                        if ( that.initializeTemplateTryCount >
                                that.initializeTemplateMaxTryCount ) {
                            that.initializeTemplateFailed = true;
                        } else {
                            setTimeout( f, 100);
                        }
                    } else {
                        that.initializeTemplateFailed = true;
                    }
                });
            }
        };
        f();
        */
    },

    isInitializeComplete: function() {
        return (this.templatePath == null || this.template != null);
    },
    initializeRenderContext: function() {
        //Object.create is used because we don't want to modify the class's render context.
        this.renderContext = Object.create(this.renderContext);
        this.renderContext.label = this.label;
        this.renderContext.name = this.name;
        this.renderContext.disabled = this.disabled;
        this.renderContext.image = this.image;
        this.renderContext.audio = this.audio;
        this.renderContext.video = this.video;
        this.renderContext.hide = this.hide;
        this.renderContext.hint = this.hint;
        //It's probably not good to get data like this in initialize
        //Maybe it would be better to use handlebars helpers to get metadata?
        this.renderContext.formName = database.getMetaDataValue('formName');
        this.renderContext.formVersion = database.getMetaDataValue('formVersion');
        
        this.renderContext.htmlAttributes = $.extend({}, this.baseHtmlAttributes, this.htmlAttributes);
        $.extend(this.renderContext, this.templateContext);
    },
    afterInitialize: function() {},
    onActivate: function(readyToRenderCallback) {
        var that;
        this.whenTemplateIsReady(readyToRenderCallback);
    },
    /**
     * stopPropagation is used in the events map to disable swiping on various elements
     **/
    stopPropagation: function(evt){
        console.log('stopProp');
        console.log(evt);
        evt.stopImmediatePropagation();
    },
    render: function() {
        this.$el.html(this.template(this.renderContext));
        //Triggering create seems to prevent some issues where jQm styles are not applied.
        this.$el.trigger('create');
        return this;
    },
    //Stuff to be added
    /*
    baseValidate: function(isMoveBackward, context) {
        var that = this;
        var defaultContext = {
            success: function() {},
            failure: function() {}
        };
        context = $.extend(defaultContext, context);
        
        if ( !('name' in that) ) {
            // no data validation if no persistence...
            that.valid = true;
        } else {
            var isRequired;
            if ( that.required ) {
                isRequired = that.required();
            } else {
                isRequired = false;
            }
            
            if ( isRequired && (that.getValue() == null) ) {
                that.valid = false;
            } else if ( that.getValue() == null || that.getValue().length == 0) {
                that.valid = true;
            } else if ( that.validateValue || that.validate ) {
                if ( that.validateValue ) {
                    that.valid = that.validateValue();
                } else {
                    that.valid = true;
                }
                if ( that.valid && that.validate ) {
                    that.valid = that.validate();
                }
            } else {
                that.valid = true;
            }
        }
            
        if (that.valid) {
            context.success();
        } else {
            context.failure();
        }
    },
    */
    //baseValidate isn't meant to be overidden or called externally.
    //It does validation that will be common to most prompts.
    //Validate is menat be overridden and publicly called. 
    //It is validate's responsibility to call baseValidate.
    baseValidate: function(context) {
        var that = this;
        var isRequired = ('required' in that) ? that.required() : false;
        var defaultContext = {
            success: function() {},
            failure: function() {}
        };
        context = $.extend(defaultContext, context);
        that.valid = true;
        if ( !('name' in that) ) {
            // no data validation if no persistence...
            context.success();
            return;
        } 
        if ( that.getValue() == null || that.getValue().length == 0 ) {
            if ( isRequired ) {
                that.valid = false;
                $( "#screenPopup" ).find('.message').text("Required value not provided.");
                $( "#screenPopup" ).popup( "open" );
                context.failure();
                return;
            }
        } else if ( 'validateValue' in that ) {
            if ( !that.validateValue() ) {
                that.valid = false;
                $( "#screenPopup" ).find('.message').text("Invalid value.");
                $( "#screenPopup" ).popup( "open" );
                context.failure();
                return;
            }
        } 
        if ( 'constraint' in that ) {
            console.log(that.constraint)
            if ( !that.constraint() ) {
                that.valid = false;
                $( "#screenPopup" ).find('.message').text(that.constraint_message);
                $( "#screenPopup" ).popup( "open" );
                context.failure();
                return;
            }
        }
        context.success();
    },
    validate: function(context) {
        return this.baseValidate(context);
    },
    getValue: function() {
        if (!this.name) {
            console.error(this);
            throw "Cannot get value of prompt with no name.";
        }
        return database.getDataValue(this.name);
    },
    setValue: function(value, onSuccessfulSave, onFailure) {
        // NOTE: data IS NOT updated synchronously. Use callback!
        var that = this;
        database.setData(that.name, that.datatype, value, onSuccessfulSave, onFailure);
    },
    beforeMove: function(context) {
        context.success();
    },
    getCallback: function(actionPath) {
        alert('getCallback: Unimplemented: ' + actionPath);
    },
    /*
    registerChangeHandlers: function() {
        // TODO: code that is executed after all page prompts are inserted into the DOM.
        // This code would, e.g., handle value-change events to propagate changes across
        // a page (e.g., update calculated fields).
    },
    */
    validationFailedAction: function(isMoveBackward) {
        alert(this.validationFailedMessage);
    },
    requiredFieldMissingAction: function(isMovingBackward) {
        alert(this.requiredFieldMissingMessage);
    }

});
promptTypes.opening = promptTypes.base.extend({
    type: "opening",
    hideInHierarchy: true,
    templatePath: "templates/opening.handlebars",
    onActivate: function(readyToRenderCallback) {
        var formLogo = false;//TODO: Need way to access form settings.
        if(formLogo){
            this.renderContext.headerImg = formLogo;
        }
        var instanceName = database.getMetaDataValue('instanceName');
        if ( instanceName == null ) {
            // construct a friendly name for this new form...
            var date = new Date();
            var dateStr = date.toISOString();
            var locale = database.getMetaDataValue('formLocale');
            var formName = opendatakit.localize(database.getMetaDataValue('formName'),locale);
            instanceName = formName + "_" + dateStr; // .replace(/\W/g, "_")
            database.setMetaData('instanceName', 'string', instanceName, function(){});
        }
        this.renderContext.instanceName = instanceName;
        this.whenTemplateIsReady(function(){
            readyToRenderCallback({enableBackwardNavigation: false});
        });
    },
    renderContext: {
        headerImg: opendatakit.baseDir + 'img/form_logo.png',
        backupImg: opendatakit.baseDir + 'img/backup.png',
        advanceImg: opendatakit.baseDir + 'img/advance.png'
    },
    //Events copied from inputType, should probably refactor.
    events: {
        "change input": "modification",
        "swipeleft input": "stopPropagation",
        "swiperight input": "stopPropagation"
    },
    modification: function(evt) {
        database.setMetaData('instanceName', 'string', this.$('input').val(), function(){});
    },
    beforeMove: function(context) {
        database.setMetaData('instanceName', 'string', this.$('input').val(),
            context.success,
            context.failure);
    }
});
promptTypes.finalize = promptTypes.base.extend({
    type:"finalize",
    hideInHierarchy: true,
    valid: true,
    templatePath: "templates/finalize.handlebars",
    events: {
        "click .save-btn": "saveIncomplete",
        "click .final-btn": "saveFinal"
    },
    renderContext: {
        headerImg: opendatakit.baseDir + 'img/form_logo.png'
    },
    onActivate: function(readyToRenderCallback) {
        var formLogo = false;//TODO: Need way to access form settings.
        if(formLogo){
            this.renderContext.headerImg = formLogo;
        }
        this.renderContext.instanceName = database.getMetaDataValue('instanceName');
        //readyToRenderCallback({enableForwardNavigation: false});
        
        database.getAllData(function(tlo) {
            readyToRenderCallback({enableForwardNavigation: false});
        });
        
    },
    saveIncomplete: function(evt) {
        database.save_all_changes(false, function() {
            // TODO: call up to Collect to report completion
        });
    },
    saveFinal: function(evt) {
        database.save_all_changes(true, function() {
            // TODO: call up to Collect to report completion
        });
        
    }
});
promptTypes.json = promptTypes.base.extend({
    type:"json",
    hideInHierarchy: true,
    valid: true,
    templatePath: "templates/json.handlebars",
    onActivate: function(readyToRenderCallback) {
        var that = this;
        database.getAllData(function(tlo) {
            if ( JSON != null ) {
                that.renderContext.value = JSON.stringify(tlo,null,2);
            } else {
                that.renderContext.value = "JSON Unavailable";
            }
            this.whenTemplateIsReady(function(){
                readyToRenderCallback({enableNavigation: false});
            });
        });
    }
});
promptTypes.instances = promptTypes.base.extend({
    type:"instances",
    hideInHierarchy: true,
    valid: true,
    templatePath: "templates/instances.handlebars",
    events: {
        "click .openInstance": "openInstance",
        "click .deleteInstance": "deleteInstance",
        "click .createInstance": "createInstance"
    },
    onActivate: function(readyToRenderCallback) {
        var that = this;
        database.withDb(function(transaction) {
            var ss = database.getAllFormInstancesStmt();
            transaction.executeSql(ss.stmt, ss.bind, function(transaction, result) {
                that.renderContext.instances = [];
                console.log('test');
                for ( var i = 0 ; i < result.rows.length ; i+=1 ) {
                    var instance = result.rows.item(i);
                    that.renderContext.instances.push({
                        instanceName: instance.instanceName,
                        instance_id: instance.instance_id,
                        last_saved_timestamp: new Date(instance.last_saved_timestamp),
                        saved_status: instance.saved_status
                    });
                }
            });
        }, function(error) {
            console.log("populateInstanceList: failed");
        }, function() {
            $.extend(that.renderContext, {
                formName: database.getMetaDataValue('formName'),
                headerImg: opendatakit.baseDir + 'img/form_logo.png'
            });
            that.whenTemplateIsReady(function(){
                readyToRenderCallback({
                    showHeader: false,
                    enableNavigation:false,
                    showFooter:false
                });
            })
        });
    },
    createInstance: function(evt){
        evt.stopPropagation(true);
        opendatakit.openNewInstanceId(null);
    },
    openInstance: function(evt) {
        evt.stopPropagation(true);
        opendatakit.openNewInstanceId($(evt.target).attr('id'));
    },
    deleteInstance: function(evt){
        var that = this;
        database.delete_all(database.getMetaDataValue('formId'), $(evt.target).attr('id'), function() {
            that.onActivate(function(){that.render();});
        });
    }
});
promptTypes.hierarchy = promptTypes.base.extend({
    type:"hierarchy",
    hideInHierarchy: true,
    valid: true,
    templatePath: 'templates/hierarchy.handlebars',
    events: {
    },
    onActivate: function(readyToRenderCallback) {
        this.renderContext.prompts = controller.prompts;
        this.whenTemplateIsReady(function(){
            readyToRenderCallback({showHeader: false, showFooter: false});
        });
    }
});
promptTypes.repeat = promptTypes.base.extend({
    type: "repeat",
    valid: true,
    templatePath: 'templates/repeat.handlebars',
    events: {
        "click .openInstance": "openInstance",
        "click .deleteInstance": "deleteInstance",
        "click .addInstance": "addInstance"
    },
    onActivate: function(readyToRenderCallback) {
        var that = this;
        var subsurveyType = this.param;
        database.withDb(function(transaction) {
            //TODO: Make statement to get all subsurveys with this survey as parent.
            var ss = database.getAllFormInstancesStmt();
            transaction.executeSql(ss.stmt, ss.bind, function(transaction, result) {
                that.renderContext.instances = [];
                console.log('test');
                for ( var i = 0 ; i < result.rows.length ; i+=1 ) {
                    that.renderContext.instances.push(result.rows.item(i));
                }
            });
        }, function(error) {
            console.log("populateInstanceList: failed");
        }, function() {
            readyToRenderCallback();
        });
    },
    openInstance: function(evt) {
        var instanceId = $(evt.target).attr('id');
    },
    deleteInstance: function(evt) {
        var instanceId = $(evt.target).attr('id');
    },
    addInstance: function(evt) {
        //TODO: Launch new instance of collect
    }
});
promptTypes.select = promptTypes.select_multiple = promptTypes.base.extend({
    type: "select",
    datatype: "text",
    templatePath: "templates/select.handlebars",
    events: {
        "change input": "modification"
    },
    choiceFilter: function(){ return true; },
    updateRenderValue: function(formValue) {
        var that = this;
        console.error(formValue);
        //that.renderContext.value = formValue;
        var filteredChoices = _.filter(that.renderContext.choices, function(choice){
            return that.choiceFilter(choice);
        });
        if ( !formValue ) {
            /*
            that.renderContext.choices = .map(filteredChoices, function(choice) {
                choice.checked = false;
                return choice;
            });
            */
            return;
        }
        that.renderContext.choices = _.map(filteredChoices, function(choice) {
            choice.checked = _.any(formValue, function(valueObject) {
                return choice.name === valueObject.value;
            });
            return choice;
        });
        var otherObject = _.find(formValue, function(valueObject) {
            return (that.name + 'OtherValue' === valueObject.value);
        })
        that.renderContext.other = {
            value: otherObject ? otherObject.value : '',
            checked: _.any(formValue, function(valueObject) {
                return (that.name + 'Other' === valueObject.name);
            })
        };
        console.log(that.renderContext);
        that.render();
    },
    // TODO: choices should be cloned and allow calculations in the choices
    // perhaps a null 'name' would drop the value from the list of choices...
    // could also allow calculations in the 'checked' and 'value' fields.
    modification: function(evt) {
        var that = this;
        console.log("select modification");
        console.log(this.$('form').serializeArray());
        var formValue = (this.$('form').serializeArray());
        var saveValue = formValue ? JSON.stringify(formValue) : null;
        this.setValue(saveValue, function() {
            that.updateRenderValue(formValue);
        });
    },
    onActivate: function(readyToRenderCallback) {
        var that = this;
        if(this.param in this.form.choices) {
            //Very important.
            //We need to clone the choices so their values are unique to the prompt.
            that.renderContext.choices = _.map(this.form.choices[this.param], _.clone);
        }
        var saveValue = that.getValue();
        that.updateRenderValue(saveValue ? JSON.parse(saveValue) : null);
        this.whenTemplateIsReady(function(){
            readyToRenderCallback();
        });
    }
});
promptTypes.select_one = promptTypes.select.extend({
    renderContext: {
        select_one: true
    },
    events: {
        "change input": "modification",
        "click .deselect": "deselect"
    },
    deselect: function(evt) {
        var that = this;
        this.setValue(null, function() {
            that.updateRenderValue(null);
        });
    }
});
promptTypes.select_one_or_other = promptTypes.select_one.extend({
    renderContext: {
        select_one: true,
        or_other: true
    }
});
promptTypes.select_or_other = promptTypes.select.extend({
    renderContext: {
        or_other: true
    }
});
/*
promptTypes.dropdownSelect = promptTypes.base.extend({
    type: "dropdownSelect",
    templatePath: "templates/dropdownSelect.handlebars",
    events: {
        "change select": "modification"
    },
    modification: function(evt) {
        console.log("select modification");
        var that = this;
        database.putData(this.name, "string", that.$('select').val(), function() {
            that.render();
        });
    },
    render: function() {
        var value = this.getValue();
        console.log(value);
        var context = {
            name: this.name,
            label: this.label,
            choices: _.map(this.choices, function(choice) {
                if (_.isString(choice)) {
                    choice = {
                        label: choice,
                        value: choice
                    };
                }
                else {
                    if (!('label' in choice)) {
                        choice.label = choice.name;
                    }
                }
                choice.value = choice.name;
                return $.extend({
                    selected: (choice.value === value)
                }, choice);
            })
        };
        this.$el.html(this.template(context));
    }
});
*/
promptTypes.inputType = promptTypes.text = promptTypes.base.extend({
    type: "text",
    datatype: "text",
    templatePath: "templates/inputType.handlebars",
    renderContext: {
        "type": "text"
    },
    events: {
        "change input": "modification",
        "swipeleft .input-container": "stopPropagation",
        "swiperight .input-container": "stopPropagation"
    },
    debouncedModification: _.debounce(function(that, evt) {
        //a debounced function will postpone execution until after wait (parameter 2)
        //milliseconds have elapsed since the last time it was invoked.
        //Useful for sliders.
        //It might be better to listen for the jQm event for when a slider is released.
        //This could cause problems since the debounced function could fire after a page change.
        var renderContext = this.renderContext;
        var value = this.$('input').val();
        this.setValue((value.length == 0 ? null : value), function() {
            renderContext.value = value;
            renderContext.invalid = !that.validateValue();
            that.render();
        });
    }, 600),
    modification: function(evt) {
        this.debouncedModification(this, evt);
    },
    onActivate: function(readyToRenderCallback) {
        var renderContext = this.renderContext;
        var value = this.getValue();
        renderContext.value = value;
        this.whenTemplateIsReady(function(){
            readyToRenderCallback();
        });
    },
    beforeMove: function(context) {
        var that = this;
        that.setValue(this.$('input').val(), context.success, context.failure );
    },
    validateValue: function() {
        return true;
    }
});
promptTypes.integer = promptTypes.inputType.extend({
    type: "integer",
    datatype: "integer",
    baseHtmlAttributes: {
        'type':'number'
    },
    invalidMessage: "Integer value expected",
    validateValue: function() {
        return !isNaN(parseInt(this.getValue()));
    }
});
promptTypes.number = promptTypes.inputType.extend({
    type: "number",
    datatype: "number",
    //TODO: This doesn't seem to be working.
    baseHtmlAttributes: {
        'type':'number'
    },
    invalidMessage: "Numeric value expected",
    validateValue: function() {
        return !isNaN(parseFloat(this.getValue()));
    }
});
promptTypes.datetime = promptTypes.inputType.extend({
    type: "date",
    datatype: "string",
    baseHtmlAttributes: {
        'type':'date'
    },
    scrollerAttributes: {
        preset: 'datetime',
        theme: 'jqm'
        //Avoiding inline because there
        //can be some debouncing issues
        //display: 'inline',
        //Warning: mixed/clickpick mode doesn't work on galaxy nexus
        //mode: 'scroll'
    },
    events: {
        "change input": "modification",
        "swipeleft input": "stopPropagation",
        "swiperight input": "stopPropagation"
    },
    onActivate: function(readyToRenderCallback) {
        var that = this;
        var renderContext = this.renderContext;
        var value = this.getValue();
        renderContext.value = value;
        require(["mobiscroll"], function() {
            $.scroller.themes.jqm.defaults = {
                jqmBody: 'd',
                jqmHeader:'d',
                jqmWheel: 'd',
                jqmClickPick: 'd',
                jqmSet: 'd',
                jqmCancel: 'd'
            };
            that.whenTemplateIsReady(function(){
                readyToRenderCallback();
            });
        });
    },
    render: function() {
        var that = this;
        that.$el.html(that.template(that.renderContext));
        //Triggering create seems to prevent some issues where jQm styles are not applied.
        that.$el.trigger('create');
        that.$('input').scroller(that.scrollerAttributes);
        return this;
    }
});
promptTypes.date = promptTypes.datetime.extend({
    type: "time",
    baseHtmlAttributes: {
        'type':'date'
    },
    scrollerAttributes: {
        preset: 'date',
        theme: 'jqm'
    }
});
promptTypes.time = promptTypes.datetime.extend({
    type: "string",
    baseHtmlAttributes: {
        'type':'time'
    },
    scrollerAttributes: {
        preset: 'time',
        theme: 'jqm'
    }
});
/**
 * Media is an abstract object used as a base for image/audio/video
 */
promptTypes.media = promptTypes.base.extend({
    type: "media",
    events: {
        "click .captureAction": "capture"
    },
    getCallback: function(bypath, byaction) {
        var that = this;
        return function(path, action, jsonString) {
            var jsonObject = JSON.parse(jsonString);
            if (jsonObject.status == -1 /* Activity.RESULT_OK */ ) {
                console.log("OK status returned");
                var mediaPath = (jsonObject.result !== null) ? jsonObject.result.mediaPath : null;
                if (mediaPath !== null) {
                    database.getData(that.name, function(value) {
                        console.log("found this path: " + value);
                        if (mediaPath != value) {
                            database.putData(that.name, "file", mediaPath, function() {
                                // TODO: delete old??? Or leave until marked as finalized?
                                // TODO: I'm not sure how the resuming works, but we'll need to make sure
                                // onActivate get's called AFTER this happens.
                            });
                        }
                    });
                }
            }
            else {
                console.log("failure returned");
                alert(jsonObject.result);
            }
        };
    }
});
promptTypes.image = promptTypes.media.extend({
    type: "image",
    datatype: "image",
    label: 'Take your photo:',
    templatePath: "templates/image.handlebars",
    onActivate: function(readyToRenderCallback) {
        var that = this;
        var value = that.getValue();
        that.renderContext.mediaPath = value;
        that.renderContext.uriValue = opendatakit.asUri(value, 'img');
        this.whenTemplateIsReady(function(){
            readyToRenderCallback();
        });
    },
    capture: function() {
        var platInfo = opendatakit.getPlatformInfo();
        if (platInfo.container == 'Android') {
            // TODO: is this the right sequence?
            var outcome = collect.doAction('' + this.promptIdx, 'takePicture', 'org.opendatakit.collect.android.activities.MediaCaptureImageActivity', null);
            console.log("button click outcome is " + outcome);
            if (outcome === null || outcome !== "OK") {
                alert("Should be OK got >" + outcome + "<");
            }
        }
        else {
            // TODO: enable file chooser???
            alert("Not running on Android -- disabled");
        }
    }
});
promptTypes.video = promptTypes.media.extend({
    type: "video",
    label: 'Take your video:',
    templatePath: "templates/video.handlebars",
    onActivate: function(readyToRenderCallback) {
        var that = this;
        var value = that.getValue();
        if (value != null && value.length != 0) {
            that.renderContext.uriValue = opendatakit.asUri(value, 'video', 'src');
            that.renderContext.videoPoster = opendatakit.asUri(opendatakit.baseDir + "img/play.png", 'video', 'poster');
        }
        this.whenTemplateIsReady(function(){
            readyToRenderCallback();
        });
    },
    capture: function() {
        var platInfo = opendatakit.getPlatformInfo();
        if (platInfo.container == 'Android') {
            // TODO: is this the right sequence?
            var outcome = collect.doAction('' + this.promptIdx, 'takeVideo', 'org.opendatakit.collect.android.activities.MediaCaptureVideoActivity', null);
            console.log("button click outcome is " + outcome);
            if (outcome === null || outcome !== "OK") {
                alert("Should be OK got >" + outcome + "<");
            }
        }
        else {
            // TODO: enable file chooser???
            alert("Not running on Android -- disabled");
        }
    }
});
promptTypes.audio = promptTypes.media.extend({
    type: "audio",
    datatype: "audio",
    templatePath: "templates/audio.handlebars",
    label: 'Take your audio:',
    capture: function() {
        var platInfo = opendatakit.getPlatformInfo();
        if (platInfo.container == 'Android') {
            // TODO: is this the right sequence?
            var outcome = collect.doAction('' + this.promptIdx, 'takeAudio', 'org.opendatakit.collect.android.activities.MediaCaptureAudioActivity', null);
            console.log("button click outcome is " + outcome);
            if (outcome === null || outcome !== "OK") {
                alert("Should be OK got >" + outcome + "<");
            }
        }
        else {
            // TODO: enable file chooser???
            alert("Not running on Android -- disabled");
        }
    }

});
promptTypes.screen = promptTypes.base.extend({
    type: "screen",
    prompts: [],
    initialize: function() {
        var that = this;
        this.prompts = builder.initializePrompts(this.prompts);
        //Wire up the prompts so that if any of them rerender the screen rerenders.
        //TODO: Think about whether there is a better way of doing this.
        //Maybe bind this or subprompts to database change events instead?
        _.each(this.prompts, function(prompt){
            prompt._screenRender = prompt.render;
            prompt.render = function(){
                that.render();
            };
        });
        this.initializeTemplate();
        this.initializeRenderContext();
        this.afterInitialize();
    },
    isInitializeComplete: function() {
        var i;
        for ( i = 0 ; i < this.prompts.length; ++i ) {
            var p = this.prompts[i];
            if ( !p.isInitializeComplete() ) return false;
        }
        return true;
    },
    validate: function(context) {
        var that = this;
        var subPrompts, subPromptContext;
        subPrompts = _.filter(this.prompts, function(prompt) {
            if('condition' in prompt) {
                return prompt.condition();
            }
            return true;
        });
        subPromptContext = {
            success: _.after(subPrompts.length, context.success),
            failure: _.once(context.failure)
        }
        $.each(subPrompts, function(idx, prompt){
            prompt.validate(subPromptContext);
        });
    },
    onActivate: function(readyToRenderCallback) {
        var that = this;
        var subPromptsReady = _.after(this.prompts.length, function () {
            readyToRenderCallback();
        });
        _.each(this.prompts, function(prompt){
            prompt.onActivate(subPromptsReady);
        });
    },
    render: function(){
        var subPrompts = _.filter(this.prompts, function(prompt) {
            if('condition' in prompt) {
                return prompt.condition();
            }
            return true;
        });
        this.$el.html('<div class="odk odk-prompts">');
        var $prompts = this.$('.odk-prompts');
        $.each(subPrompts, function(idx, prompt){
            //prompt.render();
            prompt._screenRender();
            if(!prompt.$el){
                alert("Sub-prompt has not been rendered. See console for details.");
                console.error("Prompts must have synchronous render functions. Don't debounce them or launch async calls before el is set.");
                console.error(prompt);
            }
            $prompts.append(prompt.$el);
            prompt.delegateEvents();
        });
        this.$el.trigger('create');
    }
});
promptTypes.label = promptTypes.base.extend({
    type: "label",
    isInitializeComplete: function() {
        return true;
    },
    onActivate: function(readyToRenderCallback){
        alert("label.onActivate: Should never be called!");
    }
});
promptTypes.goto = promptTypes.base.extend({
    type: "goto",
    hideInHierarchy: true,
    isInitializeComplete: function() {
        return true;
    },
    onActivate: function(readyToRenderCallback) {
        alert("goto.onActivate: Should never be called!");
    }
});
//TODO: Remove
promptTypes.goto_if = promptTypes.base.extend({
    type: "goto_if",
    hideInHierarchy: true,
    isInitializeComplete: function() {
        return true;
    },
    condition: function(){
        return false;
    },
    onActivate: function(readyToRenderCallback) {
        alert("goto_if.onActivate: Should never be called!");
    }
});
promptTypes.note = promptTypes.base.extend({
    type: "note",
    templatePath: "templates/note.handlebars"
});
promptTypes.acknowledge = promptTypes.select.extend({
    type: "acknowledge",
    autoAdvance: false,
    modification: function(evt) {
        var that = this;
        var acknowledged = this.$('#acknowledge').is(':checked');
        this.setValue(acknowledged, function() {
            that.renderContext.choices = [{
                "name": "acknowledge",
                "label": "Acknowledge",
                "checked": acknowledged
            }];
            if(acknowledged && that.autoAdvance) {
                controller.gotoNextScreen();
            }
        });
    },
    onActivate: function(readyToRenderCallback) {
        var that = this;
        var acknowledged;
        try{
            acknowledged = JSON.parse(that.getValue());
        } catch(e) {
            acknowledged = false;
        }
        
        that.renderContext.choices = [{
            "name": "acknowledge",
            "label": "Acknowledge",
            "checked": acknowledged
        }];
        this.whenTemplateIsReady(function(){
            readyToRenderCallback();
        });
    }
});
});
