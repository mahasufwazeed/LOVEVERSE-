#include "LoveVerseAnimationComponent.h"

#include "Animation/AnimMontage.h"
#include "GameFramework/Character.h"
#include "Net/UnrealNetwork.h"

ULoveVerseAnimationComponent::ULoveVerseAnimationComponent()
{
    SetIsReplicatedByDefault(true);
}

void ULoveVerseAnimationComponent::SetLocomotionState(ELVLocomotionState NewState)
{
    if (GetOwner() && GetOwner()->HasAuthority())
    {
        ApplyLocomotionState(NewState);
        return;
    }
    ServerSetLocomotionState(NewState);
}

void ULoveVerseAnimationComponent::ServerSetLocomotionState_Implementation(ELVLocomotionState NewState)
{
    ApplyLocomotionState(NewState);
}

void ULoveVerseAnimationComponent::PlayInteraction(ELVCoupleInteraction Interaction)
{
    ActiveInteraction = Interaction;
    if (const TObjectPtr<UAnimMontage>* Montage = InteractionMontages.Find(Interaction))
    {
        if (ACharacter* Character = Cast<ACharacter>(GetOwner()))
        {
            Character->PlayAnimMontage(*Montage);
        }
    }
}

void ULoveVerseAnimationComponent::ApplyLocomotionState(ELVLocomotionState NewState)
{
    if (LocomotionState == NewState)
    {
        return;
    }
    LocomotionState = NewState;
    OnRep_LocomotionState();
}

void ULoveVerseAnimationComponent::OnRep_LocomotionState()
{
    OnLocomotionChanged.Broadcast(LocomotionState);
}

void ULoveVerseAnimationComponent::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);
    DOREPLIFETIME(ULoveVerseAnimationComponent, LocomotionState);
    DOREPLIFETIME(ULoveVerseAnimationComponent, ActiveInteraction);
}
