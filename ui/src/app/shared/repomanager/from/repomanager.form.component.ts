import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Project } from 'app/model/project.model';
import { RepoManagerService } from 'app/service/repomanager/project.repomanager.service';
import { ToastService } from 'app/shared/toast/ToastService';
import {
    CallbackRepositoryManagerBasicAuthInProject,
    CallbackRepositoryManagerInProject,
    ConnectRepositoryManagerInProject
} from 'app/store/project.action';
import { ProjectState, ProjectStateModel } from 'app/store/project.state';
import { finalize, flatMap } from 'rxjs/operators';

@Component({
    selector: 'app-repomanager-form',
    templateUrl: './repomanager.form.html',
    styleUrls: ['./repomanager.form.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RepoManagerFormComponent {

    // project
    @Input() project: Project;
    @Input() disableLabel: boolean = false;

    public ready = false;
    public connectLoading = false;
    public verificationLoading = false;

    // Repo manager form data
    reposManagerList: string[];
    selectedRepoId: number;

    // Repo manager validation
    public addRepoResponse: any;
    validationToken: string;

    basicUser: string;
    basicPassword: string;

    repoModalVisible: boolean;

    constructor(
        private _repoManService: RepoManagerService,
        private _toast: ToastService,
        public _translate: TranslateService,
        private _cd: ChangeDetectorRef,
        private store: Store) {
        this._repoManService.getAll()
            .pipe(finalize(() => this._cd.markForCheck()))
            .subscribe(res => {
                this.ready = true;
                this.reposManagerList = res;
            });
    }

    create(): void {
        if (this.selectedRepoId && this.reposManagerList[this.selectedRepoId]) {

            this.connectLoading = true;
            this.store.dispatch(new ConnectRepositoryManagerInProject({
                projectKey: this.project.key,
                repoManager: this.reposManagerList[this.selectedRepoId]
            })).pipe(
                flatMap(() => this.store.selectOnce(ProjectState)),
                finalize(() => {
                    this.connectLoading = false;
                    this._cd.markForCheck();
                })
            ).subscribe((projState: ProjectStateModel) => {
                this.addRepoResponse = projState.repoManager;
                this.repoModalVisible = true;
            });

        }
    }

    sendBasicAuth(): void {
        this.verificationLoading = true;
        this.store.dispatch(new CallbackRepositoryManagerBasicAuthInProject({
            projectKey: this.project.key,
            repoManager: this.reposManagerList[this.selectedRepoId],
            basicUser: this.basicUser,
            basicPassword: this.basicPassword
        }))
            .pipe(finalize(() => {
                this.verificationLoading = false;
                this._cd.markForCheck();
            }))
            .subscribe(() => {
                this.repoModalVisible = false;
                this.basicUser = '';
                this.basicPassword = '';
                this._toast.success('', this._translate.instant('repoman_verif_msg_ok'));
            });
    }

    sendVerificationCode(): void {
        this.verificationLoading = true;
        this.store.dispatch(new CallbackRepositoryManagerInProject({
            projectKey: this.project.key,
            repoManager: this.reposManagerList[this.selectedRepoId],
            requestToken: this.addRepoResponse.request_token,
            code: this.validationToken
        })).pipe(finalize(() => {
            this.verificationLoading = false;
            this.repoModalVisible = false;
            this._cd.markForCheck();
        }))
            .subscribe(() => {
                this._toast.success('', this._translate.instant('repoman_verif_msg_ok'));
            });
    }
}
