/********************************************************************************
 * Copyright (C) 2018 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import * as React from 'react';
// import arrayMove from 'array-move';
// import { SortableContainer, SortableElement } from 'react-sortable-hoc';
const Sortable = require('react-sortablejs');
import { ReactWidget, Widget, EXPANSION_TOGGLE_CLASS, COLLAPSED_CLASS, MessageLoop, Message } from './widgets';
import { Disposable } from '../common/disposable';
import { ContextMenuRenderer } from './context-menu-renderer';
import { MaybeArray } from '../common/types';

export const ViewContainerFactory = Symbol('ViewContainerFactory');
export interface ViewContainerFactory {
    (...widgets: Widget[]): ViewContainer;
}
export interface WidgetDescriptor {
    // TODO: https://github.com/microsoft/vscode/blob/40ae7f0312e051b8fcfac5653a588d4efdd3b396/src/vs/workbench/common/views.ts#L119-L143
}

export class ViewContainer extends ReactWidget {

    protected readonly widgets: Widget[] = [];

    constructor(protected readonly services: ViewContainer.Services, ...widgets: Widget[]) {
        super();
        this.addClass(ViewContainer.Styles.VIEW_CONTAINER_CLASS);
        for (const widget of widgets) {
            this.toDispose.push(this.addWidget(widget));
        }
    }

    public render() {
        return <ViewContainerComponent widgets={this.widgets} services={this.services} />;
    }

    addWidget(widget: Widget): Disposable {
        if (this.widgets.indexOf(widget) !== -1) {
            return Disposable.NULL;
        }
        this.widgets.push(widget);
        this.update();
        return Disposable.create(() => this.removeWidget(widget));
    }

    removeWidget(widget: Widget): boolean {
        const index = this.widgets.indexOf(widget);
        if (index === -1) {
            return false;
        }
        this.widgets.splice(index, 1);
        this.update();
        return true;
    }

    protected onResize(msg: Widget.ResizeMessage): void {
        super.onResize(msg);
        this.widgets.forEach(widget => MessageLoop.sendMessage(widget, Widget.ResizeMessage.UnknownSize));
    }

    protected onUpdateRequest(msg: Message): void {
        this.widgets.forEach(widget => widget.update());
        super.onUpdateRequest(msg);
    }

    onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        const widget = this.widgets.values().next().value;
        if (widget) {
            widget.activate();
        }
    }

}

export namespace ViewContainer {
    export interface Props {
        readonly services: Services;
        readonly widgets?: MaybeArray<Widget>;
    }
    export interface Services {
        readonly contextMenuRenderer: ContextMenuRenderer;
    }
    export namespace Styles {
        export const VIEW_CONTAINER_CLASS = 'theia-view-container';
    }
}

export class ViewContainerComponent extends React.Component<ViewContainerComponent.Props, ViewContainerComponent.State> {

    constructor(props: Readonly<ViewContainerComponent.Props>) {
        super(props);
        const { widgets } = props;
        this.state = {
            widgets
        };
    }

    public render() {
        const items = this.state.widgets.map(w => <ViewContainerPart widget={w}></ViewContainerPart>);
        return <Sortable>
            {items}
        </Sortable>;
        // return <SortableViewContainer widgets={this.state.widgets} onSortEnd={this.onSortEnd} />;
    }

    // private onSortEnd = ({ oldIndex, newIndex }: { oldIndex: number, newIndex: number }) => {
    //     this.setState({
    //         widgets: arrayMove(this.state.widgets, oldIndex, newIndex),
    //     });
    // }

}
export namespace ViewContainerComponent {
    export interface Props {
        widgets: Widget[];
        services: ViewContainer.Services;
    }
    export interface State {
        widgets: Widget[];
    }
}

// const SortableViewContainer = SortableContainer(({ widgets }: { widgets: Widget[] }) =>
//     (
//         <div>
//             {widgets.map((widget, index) => (
//                 <SortableViewContainerPart key={widget.id} index={index} widget={widget} />
//             ))}
//         </div>
//     ));

export class ViewContainerPart extends React.Component<ViewContainerPart.Props, ViewContainerPart.State> {

    constructor(props: ViewContainerPart.Props) {
        super(props);
        this.state = {
            expanded: true
        };
    }

    protected detaching = false;
    componentWillUnmount(): void {
        const { widget } = this.props;
        if (widget.isAttached) {
            this.detaching = true;
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
        }
    }

    render(): React.ReactNode {
        const { widget } = this.props;
        const toggleClassNames = [EXPANSION_TOGGLE_CLASS];
        if (!this.state.expanded) {
            toggleClassNames.push(COLLAPSED_CLASS);
        }
        const toggleClassName = toggleClassNames.join(' ');
        const backgroundColor = '#' + (0x1000000 + (Math.random()) * 0xffffff).toString(16).substr(1, 6);
        return <div className={ViewContainerPart.Styles.VIEW_CONTAINER_PART_CLASS}>
            <div className={`theia-header ${ViewContainerPart.Styles.HEAD}`}
                title={widget.title.caption}
                onClick={this.toggle}
                onContextMenu={this.handleContextMenu}>
                <span className={toggleClassName} />
                <span className={`${ViewContainerPart.Styles.LABEL} noselect`}>{widget.title.label}</span>
                {this.state.expanded && this.renderToolbar()}
            </div>
            {this.state.expanded && <div className={ViewContainerPart.Styles.BODY} ref={this.setRef} style={{ backgroundColor }} />}
        </div>;
    }

    protected renderToolbar(): React.ReactNode {
        const { widget } = this.props;
        if (!ViewContainerPartWidget.is(widget)) {
            return undefined;
        }
        return <React.Fragment>
            {widget.toolbarElements.map((element, key) => this.renderToolbarElement(key, element))}
        </React.Fragment>;
    }

    protected renderToolbarElement(key: number, element: ViewContainerPartToolbarElement): React.ReactNode {
        if (element.enabled === false) {
            return undefined;
        }
        const { className, tooltip, execute } = element;
        const classNames = [ViewContainerPart.Styles.ELEMENT];
        if (className) {
            classNames.push(className);
        }
        return <span key={key}
            title={tooltip}
            className={classNames.join(' ')}
            onClick={async e => {
                e.stopPropagation();
                e.preventDefault();
                await execute();
                this.forceUpdate();
            }} />;
    }

    protected handleContextMenu = (event: React.MouseEvent<HTMLElement>) => {
        const { nativeEvent } = event;
        // Secondary button pressed, usually the right button.
        if (nativeEvent.button === 2 /* right */) {
            console.log('heyho!!!');
        }
    }

    protected toggle = () => {
        if (this.state.expanded) {
            Widget.detach(this.props.widget);
        }
        this.setState({
            expanded: !this.state.expanded
        });
    }

    protected ref: HTMLElement | undefined;
    protected setRef = (ref: HTMLElement | null) => {
        const { widget } = this.props;
        if (ref) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
            // tslint:disable:no-null-keyword
            ref.insertBefore(widget.node, null);
            MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
            widget.update();
        } else if (this.detaching) {
            this.detaching = false;
            MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
        }
    }

}
export namespace ViewContainerPart {
    export interface Props {
        readonly widget: Widget
    }
    export interface State {
        expanded: boolean
    }
    export namespace Styles {
        export const VIEW_CONTAINER_PART_CLASS = 'theia-view-container-part';
        export const HEAD = 'head';
        export const BODY = 'body';
        export const LABEL = 'label';
        export const ELEMENT = 'element';
    }
}

// const SortableViewContainerPart = SortableElement(ViewContainerPart);

export interface ViewContainerPartToolbarElement {
    /** default true */
    readonly enabled?: boolean
    readonly className: string
    readonly tooltip: string
    // tslint:disable-next-line:no-any
    execute(): any
}

export interface ViewContainerPartWidget extends Widget {
    readonly toolbarElements: ViewContainerPartToolbarElement[];
}

export namespace ViewContainerPartWidget {
    export function is(widget: Widget | undefined): widget is ViewContainerPartWidget {
        return !!widget && ('toolbarElements' in widget);
    }
}
